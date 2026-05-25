---
sidebar_position: 1
---

# Процеси, потоки та клас Thread

## Що таке процес і потік

Перш ніж писати багатопотоковий код, важливо розуміти два фундаментальних поняття операційної системи.

**Процес (Process)** — це ізольований екземпляр запущеної програми. Кожен процес має власний адресний простір пам'яті, власні ресурси (файли, з'єднання тощо) і щонайменше один потік виконання. Якщо запустити Notepad двічі — це два окремих процеси.

**Потік (Thread)** — це одиниця виконання всередині процесу. Всі потоки одного процесу поділяють його пам'ять і ресурси, але кожен має власний **стек викликів** та **лічильник команд**.

```
╔══════════════════════════════════════════════════════════╗
║  ПРОЦЕС (MyApp.exe)                                      ║
║                                                          ║
║  Спільна пам'ять: куча, статичні поля, об'єкти           ║
║                                                          ║
║  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  ║
║  │   Потік 1     │  │   Потік 2     │  │  Потік 3    │  ║
║  │  (UI Thread)  │  │  (Worker)     │  │  (Worker)   │  ║
║  │               │  │               │  │             │  ║
║  │  Власний стек │  │  Власний стек │  │  Власний    │  ║
║  │  Власний IP   │  │  Власний IP   │  │  стек / IP  │  ║
║  └───────────────┘  └───────────────┘  └─────────────┘  ║
╚══════════════════════════════════════════════════════════╝
```

| Характеристика | Процес | Потік |
|---|---|---|
| Адресний простір | Власний, ізольований | Спільний з іншими потоками процесу |
| Витрати на створення | Великі (~10–50 мс) | Менші (~0.1–1 мс) |
| Взаємодія | Через IPC (pipe, socket, shared memory) | Безпосередньо через спільну пам'ять |
| Падіння одного | Не впливає на інші процеси | Може обрушити весь процес |
| Паралелізм | Між процесами | Між потоками одного процесу |

## Навіщо потрібна багатопотоковість

Є два головні сценарії, де багатопотоковість рятує:

**1. Відзивчивість UI.** Якщо виконати важку операцію (завантаження файлу, обчислення) у головному потоці — UI "зависає" і не реагує на кліки. Перенесення роботи у фоновий потік вирішує проблему.

**2. Паралельні обчислення.** Сучасні процесори мають 4–16+ ядер. Однопотокова програма використовує лише одне. Розбивши задачу на кілька потоків, можна отримати реальне прискорення в N разів (де N — кількість ядер).

```csharp
// Без багатопотоковості — UI зависає на 5 секунд
private void Button_Click(object sender, RoutedEventArgs e)
{
    Thread.Sleep(5000); // Симулюємо важку роботу
    label.Content = "Готово!"; // Тут же оновлюємо UI
}

// З багатопотоковістю — UI живий весь час
private void Button_Click(object sender, RoutedEventArgs e)
{
    var thread = new Thread(() =>
    {
        Thread.Sleep(5000); // Важка робота у фоні
        // Оновлення UI — тільки через Dispatcher
        Dispatcher.Invoke(() => label.Content = "Готово!");
    });
    thread.IsBackground = true;
    thread.Start();
}
```

## Клас Thread

`System.Threading.Thread` — базовий клас для роботи з потоками у .NET. Це найнижчий рівень API для потоків.

### Створення та запуск потоку

Є два способи задати код для виконання у потоці:

**`ThreadStart`** — делегат без параметрів і без повернення значення:

```csharp
using System.Threading;

// Спосіб 1: окремий метод
private void DoWork()
{
    Console.WriteLine($"Потік {Thread.CurrentThread.ManagedThreadId} працює...");
    Thread.Sleep(2000);
    Console.WriteLine("Роботу виконано!");
}

var thread1 = new Thread(DoWork); // ThreadStart виводиться автоматично
thread1.Start();

// Спосіб 2: лямбда
var thread2 = new Thread(() =>
{
    Console.WriteLine("Лямбда у новому потоці");
});
thread2.Start();
```

**`ParameterizedThreadStart`** — делегат з одним параметром типу `object`:

```csharp
// Оголошення
private void DownloadFile(object? url)
{
    string fileUrl = (string)url!;
    Console.WriteLine($"Завантажую: {fileUrl}");
    Thread.Sleep(3000); // Симуляція завантаження
    Console.WriteLine($"Завантажено: {fileUrl}");
}

// Запуск з передачею параметра
var thread = new Thread(DownloadFile);
thread.Start("https://example.com/file.zip");
```

:::tip Передача кількох параметрів
`ParameterizedThreadStart` приймає лише один `object`. Щоб передати кілька значень — використайте клас або анонімний тип, або просто захопіть змінні через лямбду:

```csharp
string url = "https://example.com/file.zip";
int timeoutMs = 5000;

var thread = new Thread(() =>
{
    Console.WriteLine($"Завантажую {url} з таймаутом {timeoutMs} мс");
});
thread.Start();
```
:::

### Властивості Thread

| Властивість | Тип | Опис |
|---|---|---|
| `Name` | `string?` | Назва потоку (корисна для відлагодження) |
| `IsBackground` | `bool` | Фоновий чи передній потік |
| `Priority` | `ThreadPriority` | Пріоритет: `Lowest`, `BelowNormal`, `Normal`, `AboveNormal`, `Highest` |
| `IsAlive` | `bool` | `true`, якщо потік ще виконується |
| `IsThreadPoolThread` | `bool` | `true`, якщо потік з пулу |
| `ManagedThreadId` | `int` | Унікальний ідентифікатор потоку |
| `CurrentThread` | `Thread` | Статична — поточний потік |

```csharp
var thread = new Thread(() =>
{
    Console.WriteLine($"Я потік: {Thread.CurrentThread.Name}");
    Console.WriteLine($"Мій ID: {Thread.CurrentThread.ManagedThreadId}");
    Console.WriteLine($"Пріоритет: {Thread.CurrentThread.Priority}");
    Thread.Sleep(1000);
});

thread.Name         = "Мій робочий потік";
thread.IsBackground = true;
thread.Priority     = ThreadPriority.BelowNormal;

Console.WriteLine($"Потік живий? {thread.IsAlive}"); // False — ще не запущено
thread.Start();
Console.WriteLine($"Потік живий? {thread.IsAlive}"); // True
```

## Background vs Foreground потоки

Це один з найважливіших аспектів роботи з `Thread`.

**Foreground потік (передній):**
- Значення `IsBackground = false` (за замовчуванням)
- Процес **не завершується**, поки хоча б один foreground-потік ще виконується
- Підходить, коли потік виконує критично важливу роботу

**Background потік (фоновий):**
- Значення `IsBackground = true`
- Процес **завершується одразу**, коли завершується останній foreground-потік (всі фонові потоки примусово зупиняються)
- Підходить для обслуговуючих потоків: логування, моніторинг, кеш

```csharp
var foreground = new Thread(() =>
{
    Thread.Sleep(3000);
    Console.WriteLine("Foreground завершено"); // Виводиться завжди
});
foreground.IsBackground = false; // За замовчуванням
foreground.Start();

var background = new Thread(() =>
{
    Thread.Sleep(10000);
    Console.WriteLine("Background завершено"); // Може НЕ вивестись!
});
background.IsBackground = true;
background.Start();

// Якщо Main завершиться — foreground потік ще стримуватиме процес
// Але background буде вбито разом з процесом
Console.WriteLine("Main завершено");
```

:::warning Типова помилка
Якщо забути встановити `IsBackground = true` для допоміжного потоку — програма може не закритись після закриття вікна, бо потік досі живий у фоні.
:::

## Thread.Sleep, Thread.Join та Thread.Interrupt

### Thread.Sleep

Призупиняє **поточний** потік на вказану кількість мілісекунд:

```csharp
Console.WriteLine("До паузи");
Thread.Sleep(2000); // Зупиняємо поточний потік на 2 секунди
Console.WriteLine("Після паузи");

// Thread.Sleep(0) — підказка планувальнику передати квант часу іншому потоку
// Thread.Sleep(Timeout.Infinite) — нескінченне очікування (поки не прийде Interrupt)
```

### Thread.Join

Блокує **поточний потік** до завершення вказаного потоку:

```csharp
var worker = new Thread(() =>
{
    Console.WriteLine("Розпочав роботу...");
    Thread.Sleep(3000);
    Console.WriteLine("Завершив роботу.");
});
worker.Start();

Console.WriteLine("Чекаю на потік...");
worker.Join(); // Головний потік блокується тут
Console.WriteLine("Потік завершено, продовжую.");

// Join з таймаутом — повертає true якщо завершився, false якщо таймаут
bool finished = worker.Join(5000); // Чекати максимум 5 секунд
```

### Thread.Interrupt

`Thread.Abort()` застарів (обмежений у .NET 5+, недоступний у .NET Core). Замість нього використовується `Thread.Interrupt()`:

```csharp
var thread = new Thread(() =>
{
    try
    {
        Console.WriteLine("Почав довгу операцію...");
        Thread.Sleep(Timeout.Infinite); // Або інше очікування
        Console.WriteLine("Завершив нормально");
    }
    catch (ThreadInterruptedException)
    {
        // Виникає при виклику Interrupt(), поки потік "спить" або чекає
        Console.WriteLine("Потік перервано через Interrupt()");
        // Тут можна прибрати ресурси
    }
});
thread.Start();

Thread.Sleep(1000);
thread.Interrupt(); // Перериваємо потік
thread.Join();
Console.WriteLine("Готово");
```

:::info Коли спрацьовує ThreadInterruptedException
`ThreadInterruptedException` кидається лише коли потік знаходиться у стані очікування (`Thread.Sleep`, `Monitor.Wait`, `Thread.Join` тощо). Якщо потік зайнятий обчисленнями, виняток буде відкладено до наступного очікування.
:::

## Практичний приклад: завантаження файлу у фоні

Розглянемо реальний приклад: симуляція завантаження файлу з демонстрацією прогресу.

```csharp
using System;
using System.Threading;

class FileDownloader
{
    private Thread?   _downloadThread;
    private bool      _isCancelled;

    public void StartDownload(string url, int fileSizeMb)
    {
        _isCancelled = false;

        _downloadThread = new Thread(() => DownloadWorker(url, fileSizeMb))
        {
            Name         = $"Download-{url}",
            IsBackground = true
        };
        _downloadThread.Start();
    }

    public void Cancel()
    {
        _isCancelled = true;
        Console.WriteLine("Запит на скасування...");
    }

    public void WaitForCompletion() => _downloadThread?.Join();

    private void DownloadWorker(string url, int fileSizeMb)
    {
        Console.WriteLine($"[{Thread.CurrentThread.Name}] Починаю завантаження {url}");

        for (int mb = 1; mb <= fileSizeMb; mb++)
        {
            if (_isCancelled)
            {
                Console.WriteLine($"[{Thread.CurrentThread.Name}] Скасовано на {mb - 1} МБ");
                return;
            }

            Thread.Sleep(200); // Симулюємо мережеву затримку
            int percent = mb * 100 / fileSizeMb;
            Console.WriteLine($"[{Thread.CurrentThread.Name}] {mb}/{fileSizeMb} МБ ({percent}%)");
        }

        Console.WriteLine($"[{Thread.CurrentThread.Name}] Завантаження завершено!");
    }
}

// Використання:
var downloader = new FileDownloader();
downloader.StartDownload("https://example.com/video.mp4", 20);

// Через 2 секунди скасовуємо
Thread.Sleep(2000);
downloader.Cancel();
downloader.WaitForCompletion();
Console.WriteLine("Програма завершена.");
```

## Приклад WPF: довга операція та Dispatcher.Invoke

У WPF лише **потік UI** (головний потік) може оновлювати елементи інтерфейсу. Якщо фоновий потік спробує безпосередньо змінити властивість елемента — станеться виняток `InvalidOperationException`.

Для оновлення UI з іншого потоку використовується `Dispatcher.Invoke` або `Dispatcher.BeginInvoke`.

**XAML:**
```xml
<Window x:Class="ThreadingDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Thread Demo" Height="250" Width="450"
        Background="#1e1e2e">
    <StackPanel Margin="20" VerticalAlignment="Center">
        <TextBlock x:Name="StatusText"
                   Text="Натисніть кнопку для початку"
                   Foreground="#cdd6f4" FontSize="14"
                   HorizontalAlignment="Center" Margin="0,0,0,12"/>

        <ProgressBar x:Name="ProgressBar"
                     Minimum="0" Maximum="100" Value="0"
                     Height="20" Margin="0,0,0,12"
                     Background="#313244" Foreground="#89b4fa"/>

        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
            <Button x:Name="StartButton"
                    Content="Почати обробку"
                    Padding="14,8" Margin="0,0,8,0"
                    Background="#313244" Foreground="#cdd6f4"
                    BorderBrush="#585b70"
                    Click="OnStart_Click"/>
            <Button x:Name="CancelButton"
                    Content="Скасувати"
                    Padding="14,8"
                    Background="#313244" Foreground="#f38ba8"
                    BorderBrush="#585b70"
                    IsEnabled="False"
                    Click="OnCancel_Click"/>
        </StackPanel>
    </StackPanel>
</Window>
```

**C# (code-behind):**
```csharp
using System;
using System.Threading;
using System.Windows;

namespace ThreadingDemo
{
    public partial class MainWindow : Window
    {
        private Thread? _workerThread;
        private bool    _cancelRequested;

        public MainWindow() => InitializeComponent();

        private void OnStart_Click(object sender, RoutedEventArgs e)
        {
            StartButton.IsEnabled  = false;
            CancelButton.IsEnabled = true;
            _cancelRequested       = false;

            _workerThread = new Thread(RunHeavyWork)
            {
                IsBackground = true,
                Name         = "HeavyWorker"
            };
            _workerThread.Start();
        }

        private void OnCancel_Click(object sender, RoutedEventArgs e)
        {
            _cancelRequested = true;
        }

        private void RunHeavyWork()
        {
            // УВАГА: цей метод виконується у фоновому потоці!
            // Звертатись до UI напряму — ЗАБОРОНЕНО.

            for (int i = 0; i <= 100; i++)
            {
                if (_cancelRequested)
                {
                    // Повертаємось до UI-потоку для оновлення інтерфейсу
                    Dispatcher.Invoke(() =>
                    {
                        StatusText.Text        = "Скасовано.";
                        ProgressBar.Value      = 0;
                        StartButton.IsEnabled  = true;
                        CancelButton.IsEnabled = false;
                    });
                    return;
                }

                Thread.Sleep(50); // Симуляція роботи

                int progress = i;
                // Dispatcher.Invoke — синхронне оновлення UI з фонового потоку
                Dispatcher.Invoke(() =>
                {
                    ProgressBar.Value = progress;
                    StatusText.Text   = $"Обробка: {progress}%";
                });
            }

            Dispatcher.Invoke(() =>
            {
                StatusText.Text        = "Готово!";
                StartButton.IsEnabled  = true;
                CancelButton.IsEnabled = false;
            });
        }
    }
}
```

:::tip Dispatcher.Invoke vs Dispatcher.BeginInvoke
- `Dispatcher.Invoke(...)` — **синхронний**: фоновий потік чекає, поки UI виконає делегат
- `Dispatcher.BeginInvoke(...)` — **асинхронний**: фоновий потік продовжує одразу, не чекаючи виконання делегата

Для оновлення прогресу зазвичай використовують `BeginInvoke` (щоб не гальмувати фоновий потік), але для отримання результату від UI — `Invoke`.
:::

---

Ручне керування потоками через `Thread` дає повний контроль, але досить громіздке. У наступному розділі розглянемо зручніші абстракції — `ThreadPool` та `Task`.
