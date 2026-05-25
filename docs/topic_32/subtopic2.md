---
sidebar_position: 3
---

# async/await: асинхронне програмування

## Що таке async/await і чим відрізняється від потоків

`async/await` — це **синтаксичний цукор** над `Task`, що дозволяє писати асинхронний код у лінійному, легкочитабельному стилі.

Важливе розуміння: **async/await не завжди створює новий потік**. Це ключова відмінність від `Thread.Start()`.

```
Синхронний код:
  Потік → [Робота 1] → [Чекає 2 с] → [Робота 2]
             заблокований під час очікування

Асинхронний код з async/await:
  Потік → [Робота 1] → повертається у пул (вільний) → [Робота 2] ← потік береться знову
             під час очікування потік може виконувати інші задачі
```

| Аспект | Thread.Start | Task.Run | async/await |
|---|---|---|---|
| Новий потік | Завжди | Так (з пулу) | Не обов'язково |
| Стиль коду | Callbacks/прапорці | .ContinueWith ланцюжки | Лінійний |
| Обробка помилок | Складна | AggregateException | try/catch |
| Результат | Через змінні | `.Result` | `return` |

## async Task та async Task\<T\>

Асинхронний метод позначається ключовим словом `async`. Він повинен повертати `Task`, `Task<T>` або `void` (тільки для обробників подій).

```csharp
using System;
using System.Threading.Tasks;

// async Task — повертає "обіцянку" завершення без результату
async Task DoWorkAsync()
{
    Console.WriteLine("Початок роботи");
    await Task.Delay(2000); // Не блокує потік!
    Console.WriteLine("Кінець роботи");
}

// async Task<T> — повертає "обіцянку" з результатом
async Task<int> ComputeAsync(int n)
{
    await Task.Delay(100); // Симуляція асинхронної роботи
    return n * n;
}

// Виклик:
await DoWorkAsync();
int result = await ComputeAsync(7);
Console.WriteLine($"7² = {result}"); // 49
```

## async void: коли можна використовувати

`async void` — це спеціальний випадок, що **допустимий тільки для обробників подій** у WPF/WinForms:

```csharp
// ПРАВИЛЬНО: обробник події кнопки
private async void Button_Click(object sender, RoutedEventArgs e)
{
    StartButton.IsEnabled = false;
    await DoHeavyWorkAsync();
    StartButton.IsEnabled = true;
}

// НЕПРАВИЛЬНО: звичайний метод не повинен повертати async void
async void BadMethod() // Небезпечно!
{
    await Task.Delay(1000);
    throw new Exception("Цей виняток нікуди не потрапить!");
}
```

:::warning Небезпека async void
Якщо в `async void` методі виникне необроблений виняток — він **не може бути перехоплений** з місця виклику і призведе до аварійного завершення програми. Використовуйте `async void` **тільки** для обробників подій.
:::

## await: що відбувається під капотом

Компілятор перетворює `async`-метод у **машину станів** (state machine). Це дозволяє "призупиняти" виконання методу, не блокуючи потік.

```csharp
// Ваш код:
async Task<string> GetDataAsync()
{
    string data = await FetchFromNetworkAsync();
    string processed = await ProcessAsync(data);
    return processed;
}

// Що компілятор генерує (спрощено):
// State 0: виклик FetchFromNetworkAsync(), зберегти продовження
// State 1: отримати result, виклик ProcessAsync(), зберегти продовження
// State 2: отримати result, повернути
```

Покрокове виконання `await`:

1. Викликається асинхронний метод (`FetchFromNetworkAsync()`)
2. Якщо Task ще не завершена — поточний потік **звільняється** і повертається у пул
3. Коли Task завершується — **якийсь потік** з пулу забирає виконання з точки `await`
4. У WPF/UI контексті — продовження виконується на **тому самому UI-потоці** (завдяки `SynchronizationContext`)

```csharp
// Демонстрація звільнення потоку
async Task DemoAsync()
{
    Console.WriteLine($"До await: потік {Thread.CurrentThread.ManagedThreadId}");

    await Task.Delay(100);

    // Може бути інший потік! (якщо немає SynchronizationContext)
    Console.WriteLine($"Після await: потік {Thread.CurrentThread.ManagedThreadId}");
}
```

## ConfigureAwait(false)

За замовчуванням `await` захоплює поточний `SynchronizationContext` і повертає виконання на той самий потік/контекст. У WPF це означає повернення на UI-потік.

`ConfigureAwait(false)` вказує: **не потрібно повертатись у той самий контекст**:

```csharp
// У бібліотечному коді (не в UI-коді):
async Task<string> LibraryMethodAsync()
{
    // ConfigureAwait(false) покращує продуктивність:
    // після await продовження може виконатись у будь-якому потоці пулу
    string result = await SomeIoOperationAsync().ConfigureAwait(false);

    // Тут ми НЕ можемо звертатись до UI елементів!
    return result.ToUpper();
}

// У WPF/WinForms коді (де потрібен UI-потік):
async void Button_Click(object sender, RoutedEventArgs e)
{
    // Без ConfigureAwait(false) — після await знову UI-потік
    string data = await GetDataAsync();
    TextBox.Text = data; // Безпечно — ми на UI-потоці
}
```

:::tip Коли використовувати ConfigureAwait(false)
- **У бібліотечному коді** — завжди `ConfigureAwait(false)`, щоб не захоплювати контекст клієнта
- **У WPF/WinForms обробниках подій** — **без** `ConfigureAwait(false)`, щоб повернутись на UI-потік для оновлення інтерфейсу
:::

## Async методи у WPF: оновлення UI після await

У WPF після `await` ми **автоматично повертаємось на UI-потік** (без `ConfigureAwait(false)`), тому можна одразу оновлювати інтерфейс:

```csharp
private async void LoadData_Click(object sender, RoutedEventArgs e)
{
    LoadButton.IsEnabled = false;
    StatusLabel.Content  = "Завантаження...";

    // Цей рядок НЕ блокує UI — потік звільняється на час очікування
    string data = await Task.Run(() =>
    {
        Thread.Sleep(3000); // Симуляція важкої роботи
        return "Дані отримано!";
    });

    // Після await — ми знову на UI-потоці
    // Тут безпечно оновлювати будь-які UI-елементи
    StatusLabel.Content  = data;
    LoadButton.IsEnabled = true;
}
```

## HttpClient: завантаження даних з мережі

`HttpClient` — яскравий приклад асинхронного API:

```csharp
using System.Net.Http;

private readonly HttpClient _httpClient = new();

async Task<string> FetchWebPageAsync(string url)
{
    try
    {
        // GetStringAsync — неблокуючий мережевий запит
        string html = await _httpClient.GetStringAsync(url);
        Console.WriteLine($"Отримано {html.Length} символів з {url}");
        return html;
    }
    catch (HttpRequestException ex)
    {
        Console.WriteLine($"Мережева помилка: {ex.Message}");
        return string.Empty;
    }
}

// Завантажити кілька сторінок паралельно:
async Task FetchManyAsync()
{
    string[] urls =
    {
        "https://httpbin.org/get",
        "https://httpbin.org/ip",
        "https://httpbin.org/user-agent"
    };

    // Запускаємо всі Task одночасно — вони виконуються паралельно
    Task<string>[] tasks = urls.Select(FetchWebPageAsync).ToArray();

    // Чекаємо всіх
    string[] results = await Task.WhenAll(tasks);
    Console.WriteLine($"Завантажено {results.Length} сторінок");
}
```

## Асинхронна робота з файлами

```csharp
using System.IO;

// Читання файлу без блокування потоку
async Task<string> ReadFileAsync(string path)
{
    string content = await File.ReadAllTextAsync(path);
    return content;
}

// Запис файлу без блокування потоку
async Task WriteFileAsync(string path, string content)
{
    await File.WriteAllTextAsync(path, content);
    Console.WriteLine($"Файл збережено: {path}");
}

// Копіювання великого файлу порціями
async Task CopyLargeFileAsync(string source, string destination)
{
    const int bufferSize = 81920; // 80 КБ
    using FileStream src  = File.OpenRead(source);
    using FileStream dst  = File.Create(destination);

    byte[] buffer  = new byte[bufferSize];
    int    bytesRead;
    long   total   = src.Length;
    long   copied  = 0;

    while ((bytesRead = await src.ReadAsync(buffer)) > 0)
    {
        await dst.WriteAsync(buffer.AsMemory(0, bytesRead));
        copied += bytesRead;
        Console.WriteLine($"Скопійовано: {copied * 100 / total}%");
    }
}
```

## Паттерн "async all the way down"

Важливе правило: **якщо хоч один метод у ланцюжку async — всі повинні бути async**.

```
UI обробник (async void)
    └── LoadDataAsync() (async Task)
            └── FetchFromDatabaseAsync() (async Task<List<T>>)
                    └── dbContext.ToListAsync() (async Task<List<T>>)  ← EF Core
```

```csharp
// ПРАВИЛЬНО: весь ланцюжок async
private async void LoadButton_Click(object sender, RoutedEventArgs e)
{
    var data = await LoadDataAsync();
    UpdateUI(data);
}

private async Task<List<string>> LoadDataAsync()
{
    var raw = await FetchFromDatabaseAsync();
    return raw.Select(x => x.Name).ToList();
}

private async Task<List<User>> FetchFromDatabaseAsync()
{
    return await dbContext.Users.ToListAsync();
}

// НЕПРАВИЛЬНО: перерваний ланцюжок — дедлок у WPF/ASP.NET!
private void LoadButton_Click(object sender, RoutedEventArgs e)
{
    // .Result або .Wait() — типова пастка!
    var data = LoadDataAsync().Result; // ДЕДЛОК!
}
```

## Дедлок: типова пастка .Result та .Wait() у WPF

Це один з найпоширеніших bugs у WPF застосунках:

```csharp
// СЦЕНАРІЙ ДЕДЛОКУ у WPF:

async Task<string> GetDataAsync()
{
    await Task.Delay(1000); // SynchronizationContext захоплено (UI)
    return "Дані";           // Продовження очікує UI-потік!
}

// Де-небудь у WPF:
private void Button_Click(object sender, RoutedEventArgs e)
{
    // UI-потік блокується тут, чекаючи Task
    string result = GetDataAsync().Result;
    // ↑↑↑ ДЕДЛОК! ↑↑↑
    //
    // Що відбувається:
    // 1. UI-потік викликає GetDataAsync().Result — БЛОКУЄТЬСЯ
    // 2. GetDataAsync виконує await Task.Delay(1000) і хоче повернутись на UI-потік
    // 3. Але UI-потік ЗАБЛОКОВАНИЙ на .Result!
    // 4. Кожен чекає іншого → дедлок
}

// ПРАВИЛЬНЕ РІШЕННЯ: async всього ланцюжка
private async void Button_Click(object sender, RoutedEventArgs e)
{
    string result = await GetDataAsync(); // Не блокуємо!
    label.Content = result;
}
```

```
ДЕДЛОК — візуалізація:

  UI-потік                    Task (GetDataAsync)
     │                              │
     │── .Result ──────────────────>│ (блокується, чекає)
     │   (заблокований)             │
     │                              │── await завершено
     │                              │── потрібен UI-потік для продовження
     │<── "Дай UI-потік!" ──────────│
     │   (зайнятий, чекає Result)   │
     │                              │
     ▼   НІКОГО НЕ ВІДПУСКАЮТЬ      ▼
                   ∞
```

:::warning Правило: ніколи не блокуй асинхронний код
У WPF та ASP.NET **ніколи** не викликайте `.Result`, `.Wait()` або `.GetAwaiter().GetResult()` на `Task` у контексті UI або request-потоку. Завжди використовуйте `await`.

Єдиний безпечний виняток — консольний застосунок (без `SynchronizationContext`) або фоновий потік із `ConfigureAwait(false)` у всьому ланцюжку.
:::

## CancellationToken: скасування довгої операції

`CancellationToken` — стандартний механізм скасування асинхронних операцій у .NET.

```csharp
// Джерело токена — ним ми керуємо скасуванням
CancellationTokenSource cts = new CancellationTokenSource();
CancellationToken token = cts.Token;

// Запускаємо довгу операцію
Task longOperation = Task.Run(async () =>
{
    for (int i = 0; i < 100; i++)
    {
        // Перевіряємо чи не скасовано — кидає OperationCanceledException
        token.ThrowIfCancellationRequested();

        await Task.Delay(100, token); // Також підтримує скасування
        Console.WriteLine($"Крок {i + 1}/100");
    }
}, token);

// Через 2 секунди скасовуємо
await Task.Delay(2000);
cts.Cancel(); // Надсилаємо сигнал скасування

try
{
    await longOperation;
}
catch (OperationCanceledException)
{
    Console.WriteLine("Операція скасована.");
}
finally
{
    cts.Dispose();
}
```

### CancellationToken у WPF

```csharp
private CancellationTokenSource? _cts;

private async void StartButton_Click(object sender, RoutedEventArgs e)
{
    _cts = new CancellationTokenSource();
    StartButton.IsEnabled  = false;
    CancelButton.IsEnabled = true;

    try
    {
        await RunOperationAsync(_cts.Token);
        StatusLabel.Content = "Завершено успішно!";
    }
    catch (OperationCanceledException)
    {
        StatusLabel.Content = "Скасовано користувачем.";
    }
    finally
    {
        _cts.Dispose();
        _cts               = null;
        StartButton.IsEnabled  = true;
        CancelButton.IsEnabled = false;
    }
}

private void CancelButton_Click(object sender, RoutedEventArgs e)
{
    _cts?.Cancel();
}

private async Task RunOperationAsync(CancellationToken token)
{
    for (int i = 0; i <= 100; i++)
    {
        token.ThrowIfCancellationRequested();
        await Task.Delay(50, token);
        ProgressBar.Value = i;
        StatusLabel.Content = $"Прогрес: {i}%";
    }
}
```

### Скасування з таймаутом

```csharp
// Автоматичне скасування через 10 секунд
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

try
{
    string result = await FetchDataAsync(cts.Token);
    Console.WriteLine(result);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Операція скасована (таймаут або ручне скасування)");
}
```

---

Тепер, маючи повне розуміння `async/await` та `CancellationToken`, побудуємо повноцінний WPF-застосунок, що об'єднує всі ці концепції разом.
