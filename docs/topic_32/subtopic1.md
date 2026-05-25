---
sidebar_position: 2
---

# ThreadPool та Task

## Проблеми ручного Thread

Клас `Thread` дає повний контроль, але має суттєві недоліки:

| Проблема | Опис |
|---|---|
| **Дорогий ресурс** | Кожен `Thread` виділяє ~1 МБ стека і займає ресурси ОС |
| **Немає результату** | `Thread` не повертає значення — доводиться використовувати спільні змінні |
| **Немає обробки помилок** | Виняток у потоці важко перехопити з іншого потоку |
| **Важко компонувати** | Немає зручного способу "зробити A, потім B, потім C" |
| **Немає скасування** | Потрібно реалізовувати скасування вручну через прапорці |

Саме для вирішення цих проблем існують `ThreadPool` та `Task`.

## ThreadPool: пул потоків

`ThreadPool` — це набір заздалегідь створених потоків, якими керує .NET. Замість того щоб кожного разу створювати новий потік (дорого), ми беремо готовий потік з пулу, виконуємо роботу і повертаємо його назад.

```
┌─────────────────────────────────────────────────────┐
│                   ThreadPool                        │
│                                                     │
│  Черга завдань:  [Task A] [Task B] [Task C] [...]   │
│                     ↓        ↓        ↓             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │Потік #1 │  │Потік #2 │  │Потік #3 │  ...        │
│  └─────────┘  └─────────┘  └─────────┘             │
│   (вільний)   (зайнятий)   (вільний)                │
└─────────────────────────────────────────────────────┘
```

### QueueUserWorkItem

Найпростіший спосіб відправити роботу в пул:

```csharp
using System.Threading;

// Базовий виклик
ThreadPool.QueueUserWorkItem(_ =>
{
    Console.WriteLine($"Виконується у потоці пулу: {Thread.CurrentThread.ManagedThreadId}");
    Thread.Sleep(1000);
    Console.WriteLine("Завершено.");
});

// З передачею стану
ThreadPool.QueueUserWorkItem(state =>
{
    var url = (string)state!;
    Console.WriteLine($"Завантажую: {url}");
}, "https://example.com/data.json");

Console.WriteLine("QueueUserWorkItem не блокує — головний потік продовжує одразу");
Thread.Sleep(3000); // Чекаємо завершення для демонстрації
```

:::info Усі потоки ThreadPool є фоновими
Потоки з ThreadPool завжди мають `IsBackground = true`. Це означає, що вони не утримують процес від завершення.
:::

### Налаштування ThreadPool

```csharp
// Отримати поточні ліміти
ThreadPool.GetMinThreads(out int minWorker, out int minIo);
ThreadPool.GetMaxThreads(out int maxWorker, out int maxIo);
Console.WriteLine($"Мін. потоків: {minWorker} (worker), {minIo} (I/O)");
Console.WriteLine($"Макс. потоків: {maxWorker} (worker), {maxIo} (I/O)");

// Встановити мінімум (потоки, що завжди доступні одразу)
ThreadPool.SetMinThreads(8, 8);
```

:::warning Коли не варто використовувати ThreadPool напряму
- Якщо потрібен результат операції
- Якщо потрібно чекати завершення кількох операцій
- Якщо потрібен ланцюжок операцій ("спочатку A, потім B")

Для всього цього є `Task`.
:::

## Клас Task: сучасний підхід

`System.Threading.Tasks.Task` — це **представлення асинхронної операції**. Task вирішує всі проблеми ручного Thread і ThreadPool.

### Task.Run

Найпростіший спосіб запустити код асинхронно:

```csharp
using System.Threading.Tasks;

// Запуск без повернення результату
Task task = Task.Run(() =>
{
    Console.WriteLine($"Task виконується у потоці {Thread.CurrentThread.ManagedThreadId}");
    Thread.Sleep(2000);
    Console.WriteLine("Task завершено");
});

Console.WriteLine("Головний потік продовжує одразу");

// Чекаємо завершення Task
task.Wait(); // Блокуючий виклик
Console.WriteLine("Після wait");
```

### Task.Factory.StartNew

Надає більше параметрів:

```csharp
// Довгостроковий потік (не з пулу!)
Task longRunning = Task.Factory.StartNew(() =>
{
    Console.WriteLine("Довга операція...");
    Thread.Sleep(10000);
}, TaskCreationOptions.LongRunning);
// LongRunning — натяк планувальнику створити окремий потік, а не брати з пулу
```

:::tip Task.Run vs Task.Factory.StartNew
Для більшості завдань використовуйте `Task.Run` — це спрощена версія `Task.Factory.StartNew` з розумними налаштуваннями за замовчуванням. `Task.Factory.StartNew` потрібен лише коли потрібні специфічні `TaskCreationOptions`, зокрема `LongRunning`.
:::

## Task\<T\>: задача з результатом

`Task<T>` — це Task, що повертає значення типу `T`. Це вирішує головний недолік `Thread`.

```csharp
// Задача, що обчислює суму і повертає результат
Task<int> sumTask = Task.Run(() =>
{
    Console.WriteLine("Обчислюю суму...");
    int sum = 0;
    for (int i = 1; i <= 1_000_000; i++)
        sum += i;
    return sum; // Повертаємо результат
});

// Можна робити іншу роботу поки задача виконується
Console.WriteLine("Інша робота...");

// .Result блокує поточний потік до завершення і повертає значення
int result = sumTask.Result;
Console.WriteLine($"Результат: {result}");

// Альтернатива: GetAwaiter().GetResult()
// (краща поведінка при помилках — кидає оригінальний виняток, а не AggregateException)
int result2 = sumTask.GetAwaiter().GetResult();
```

:::warning Небезпека .Result та .Wait()
У WPF та ASP.NET застосуванні виклик `.Result` або `.Wait()` може призвести до **дедлоку** (взаємного блокування). Детально — у наступному розділі про async/await.
:::

### Практичний приклад: паралельне обчислення

```csharp
// Розбиваємо масив на частини і обчислюємо суму кожної частини паралельно
int[] data = Enumerable.Range(1, 10_000_000).ToArray();

int chunkSize = data.Length / 4;

Task<long>[] tasks = new Task<long>[4];
for (int i = 0; i < 4; i++)
{
    int start = i * chunkSize;
    int end   = (i == 3) ? data.Length : start + chunkSize;

    tasks[i] = Task.Run(() =>
    {
        long sum = 0;
        for (int j = start; j < end; j++)
            sum += data[j];
        return sum;
    });
}

// Чекаємо всі задачі і сумуємо результати
long totalSum = tasks.Sum(t => t.Result);
Console.WriteLine($"Загальна сума: {totalSum}");
```

## ContinueWith: ланцюжок задач

`ContinueWith` дозволяє вказати код, який виконається **після** завершення задачі:

```csharp
Task<string> fetchTask = Task.Run(() =>
{
    Thread.Sleep(1000); // Симуляція мережевого запиту
    return "{ \"name\": \"Alice\", \"age\": 30 }"; // JSON
});

// Ланцюжок: спочатку fetch, потім parse, потім print
fetchTask
    .ContinueWith(prev =>
    {
        string json = prev.Result;
        Console.WriteLine($"Отримано JSON: {json}");
        return json.Length; // Тут "парсимо" — просто повертаємо довжину
    })
    .ContinueWith(prev =>
    {
        int length = prev.Result;
        Console.WriteLine($"Довжина відповіді: {length} символів");
    });

// Ланцюжок не блокує — головний потік продовжує
Thread.Sleep(3000); // Чекаємо для демонстрації
```

### ContinueWith з умовою

```csharp
Task<int> riskyTask = Task.Run(() =>
{
    if (new Random().Next(2) == 0)
        throw new InvalidOperationException("Щось пішло не так!");
    return 42;
});

// Обробник успіху
riskyTask.ContinueWith(t =>
    Console.WriteLine($"Успіх: {t.Result}"),
    TaskContinuationOptions.OnlyOnRanToCompletion);

// Обробник помилки
riskyTask.ContinueWith(t =>
    Console.WriteLine($"Помилка: {t.Exception!.InnerException!.Message}"),
    TaskContinuationOptions.OnlyOnFaulted);
```

## Task.WhenAll та Task.WhenAny

### Task.WhenAll

Очікує **всі** задачі зі списку:

```csharp
Task<string>[] downloadTasks = new[]
{
    Task.Run(() => { Thread.Sleep(1000); return "Файл 1 завантажено"; }),
    Task.Run(() => { Thread.Sleep(2000); return "Файл 2 завантажено"; }),
    Task.Run(() => { Thread.Sleep(1500); return "Файл 3 завантажено"; }),
};

// Всі три задачі виконуються ПАРАЛЕЛЬНО
// Task.WhenAll завершується коли всі три готові (~2000 мс, а не 4500 мс!)
Task<string[]> allDone = Task.WhenAll(downloadTasks);
string[] results = allDone.Result;

foreach (string r in results)
    Console.WriteLine(r);
```

### Task.WhenAny

Завершується, коли **хоч одна** задача готова:

```csharp
Task<string>[] serverTasks = new[]
{
    Task.Run(() => { Thread.Sleep(3000); return "Сервер 1 відповів"; }),
    Task.Run(() => { Thread.Sleep(1000); return "Сервер 2 відповів"; }),
    Task.Run(() => { Thread.Sleep(5000); return "Сервер 3 відповів"; }),
};

// Повертає першу задачу, що завершилась
Task<string> firstDone = Task.WhenAny(serverTasks).Result;
Console.WriteLine($"Найшвидший: {firstDone.Result}");
// Виведе: "Найшвидший: Сервер 2 відповів" (через ~1000 мс)
```

## Task.Delay: асинхронна пауза

`Task.Delay` — це асинхронна альтернатива `Thread.Sleep`. На відміну від `Sleep`, вона не блокує потік:

```csharp
// Thread.Sleep блокує потік (потік нічого не робить, але зайнятий)
Thread.Sleep(2000); // Потік заблокований на 2 секунди

// Task.Delay НЕ блокує потік (потік може повернутись у пул і виконувати інші задачі)
Task.Delay(2000).Wait(); // Синхронне чекання (не рекомендується)

// Правильне використання — тільки з await (у наступному розділі)
await Task.Delay(2000);
```

## TaskStatus: стани задачі

Кожна задача проходить через кілька станів:

```
Created → WaitingForActivation → WaitingToRun → Running → RanToCompletion
                                                         → Faulted
                                                         → Canceled
```

| Стан | Опис |
|---|---|
| `Created` | Задача створена, але ще не запущена (`new Task(...)`) |
| `WaitingForActivation` | Очікує активації (наприклад, `ContinueWith`) |
| `WaitingToRun` | У черзі пулу, чекає вільного потоку |
| `Running` | Зараз виконується |
| `RanToCompletion` | Успішно завершена |
| `Faulted` | Завершена з помилкою (кинуто виняток) |
| `Canceled` | Скасована через `CancellationToken` |

```csharp
var task = new Task(() => Thread.Sleep(2000));
Console.WriteLine($"Статус: {task.Status}"); // Created

task.Start();
Console.WriteLine($"Статус: {task.Status}"); // WaitingToRun або Running

task.Wait();
Console.WriteLine($"Статус: {task.Status}"); // RanToCompletion
```

## Обробка винятків у Task

Коли виняток виникає у `Task`, він не кидається одразу. Він "загортається" у `AggregateException` і чекає, поки ви звернетесь до результату:

```csharp
Task<int> faultyTask = Task.Run(() =>
{
    throw new DivideByZeroException("Ділення на нуль!");
    return 42; // Цей рядок не досягається
});

try
{
    int result = faultyTask.Result; // Тут кидається AggregateException
}
catch (AggregateException ae)
{
    // AggregateException може містити кілька внутрішніх винятків
    foreach (Exception inner in ae.InnerExceptions)
    {
        Console.WriteLine($"Помилка: {inner.GetType().Name} — {inner.Message}");
    }
}

// Зручніший спосіб: GetAwaiter().GetResult() кидає оригінальний виняток без обгортки
try
{
    int result = faultyTask.GetAwaiter().GetResult();
}
catch (DivideByZeroException ex)
{
    Console.WriteLine($"Пряма помилка: {ex.Message}");
}
```

### Обробка помилок при Task.WhenAll

```csharp
Task[] tasks = new[]
{
    Task.Run(() => throw new ArgumentException("Помилка 1")),
    Task.Run(() => throw new InvalidOperationException("Помилка 2")),
    Task.Run(() => Console.WriteLine("Задача 3 OK")),
};

try
{
    Task.WhenAll(tasks).Wait();
}
catch (AggregateException ae)
{
    // Всі винятки зібрані в одному AggregateException
    ae.Handle(ex =>
    {
        Console.WriteLine($"Оброблено: {ex.Message}");
        return true; // true = виняток оброблений
    });
}
```

---

`Task` і `ThreadPool` є потужнішими інструментами ніж `Thread`, але вони все ще вимагають `.Result` та `.Wait()` для синхронного очікування. У наступному розділі розглянемо `async/await` — ключові слова, що роблять асинхронний код таким же читабельним, як синхронний.
