---
sidebar_position: 3
---

# TPL Dataflow: конвеєрна обробка

## Концепція Dataflow

**TPL Dataflow** — це бібліотека для побудови **конвеєрів обробки даних**. Уявіть збиральну лінію на заводі: кожна станція виконує свою операцію і передає результат наступній.

```
Концепція конвеєра:

[Дані] → [Блок 1] → [Блок 2] → [Блок 3] → [Результат]
           читання   обробка    збереження

Кожен блок:
  • має власну чергу вхідних даних
  • обробляє елементи паралельно (якщо налаштовано)
  • передає результат підключеним блокам
```

Переваги над `Parallel.ForEach`:
- **Конвеєрний паралелізм**: різні блоки обробляють різні елементи одночасно
- **Зворотний тиск (backpressure)**: `BoundedCapacity` запобігає переповненню пам'яті
- **Гнучка топологія**: блоки можна з'єднувати у складні графи (не тільки лінійно)
- **Поєднання з async/await**: блоки підтримують асинхронні операції

## NuGet-пакет

TPL Dataflow не входить до BCL і потребує встановлення пакету:

```bash
dotnet add package System.Threading.Tasks.Dataflow
```

```csharp
using System.Threading.Tasks.Dataflow;
```

## ActionBlock\<T\>: найпростіший блок

`ActionBlock<T>` — блок, який просто виконує дію для кожного елемента. Він не передає результат далі — це кінцева точка конвеєра.

```csharp
// Створення блоку
var printer = new ActionBlock<string>(message =>
{
    Console.WriteLine($"[{Thread.CurrentThread.ManagedThreadId}] {message}");
});

// Надсилання елементів
printer.Post("Перше повідомлення");
printer.Post("Друге повідомлення");
printer.Post("Третє повідомлення");

// Сигналізуємо про завершення вхідних даних
printer.Complete();

// Чекаємо обробки всіх елементів
await printer.Completion;
Console.WriteLine("Всі елементи оброблено");
```

### ActionBlock з паралельною обробкою

```csharp
var options = new ExecutionDataflowBlockOptions
{
    MaxDegreeOfParallelism = 4,    // до 4 елементів одночасно
    BoundedCapacity = 100          // максимум 100 елементів у черзі
};

var parallelProcessor = new ActionBlock<int>(
    async item =>
    {
        await Task.Delay(100);     // імітуємо асинхронну роботу
        Console.WriteLine($"Оброблено {item} на потоці {Thread.CurrentThread.ManagedThreadId}");
    },
    options
);

for (int i = 0; i < 20; i++)
{
    await parallelProcessor.SendAsync(i);  // SendAsync чекає якщо черга повна
}

parallelProcessor.Complete();
await parallelProcessor.Completion;
```

:::tip Post vs SendAsync
`Post()` — синхронний, повертає `false` якщо черга повна (`BoundedCapacity`). `SendAsync()` — асинхронний, чекає до звільнення місця в черзі. Для надійної роботи з `BoundedCapacity` використовуйте `SendAsync`.
:::

## TransformBlock\<TIn, TOut\>: трансформація елементів

`TransformBlock<TIn, TOut>` приймає елемент типу `TIn`, обробляє його і передає результат типу `TOut` наступному блоку:

```csharp
// Блок перетворює рядок на його довжину
var lengthBlock = new TransformBlock<string, int>(
    s => s.Length
);

// Блок виводить довжину
var printBlock = new ActionBlock<int>(
    length => Console.WriteLine($"Довжина: {length}")
);

// З'єднуємо блоки
lengthBlock.LinkTo(printBlock, new DataflowLinkOptions { PropagateCompletion = true });

// Надсилаємо рядки
lengthBlock.Post("Hello");
lengthBlock.Post("World!");
lengthBlock.Post("Привіт, .NET Dataflow!");

lengthBlock.Complete();
await printBlock.Completion;
```

### TransformBlock з асинхронною операцією

```csharp
// Асинхронне завантаження URL
var downloader = new TransformBlock<string, string>(
    async url =>
    {
        using var client = new HttpClient();
        var html = await client.GetStringAsync(url);
        return $"{url}: {html.Length} символів";
    },
    new ExecutionDataflowBlockOptions { MaxDegreeOfParallelism = 5 }
);

var printer = new ActionBlock<string>(Console.WriteLine);
downloader.LinkTo(printer, new DataflowLinkOptions { PropagateCompletion = true });

downloader.Post("https://example.com");
downloader.Post("https://microsoft.com");
downloader.Complete();
await printer.Completion;
```

## BufferBlock\<T\>: буферизація

`BufferBlock<T>` просто зберігає елементи в черзі і передає їх підключеним блокам. Це корисно для роз'єднання виробника і споживача:

```csharp
var buffer = new BufferBlock<int>(new DataflowBlockOptions { BoundedCapacity = 10 });

// Виробник (producer)
var producerTask = Task.Run(async () =>
{
    for (int i = 0; i < 50; i++)
    {
        await buffer.SendAsync(i);  // чекає якщо буфер повний
        Console.WriteLine($"Додано: {i}");
    }
    buffer.Complete();
});

// Споживач (consumer)
var consumer = new ActionBlock<int>(
    async item =>
    {
        await Task.Delay(50);  // повільний споживач
        Console.WriteLine($"Оброблено: {item}");
    }
);

buffer.LinkTo(consumer, new DataflowLinkOptions { PropagateCompletion = true });

await Task.WhenAll(producerTask, consumer.Completion);
```

## BroadcastBlock\<T\>: розсилка всім нащадкам

`BroadcastBlock<T>` надсилає **копію** кожного елемента **всім** підключеним блокам одночасно:

```csharp
// Один елемент → кілька обробників паралельно
var broadcaster = new BroadcastBlock<string>(msg => msg);  // клон-функція

var logBlock    = new ActionBlock<string>(msg => Console.WriteLine($"[LOG] {msg}"));
var auditBlock  = new ActionBlock<string>(msg => SaveToAudit(msg));
var alertBlock  = new ActionBlock<string>(msg => CheckAndAlert(msg));

// Підключаємо всіх слухачів
broadcaster.LinkTo(logBlock);
broadcaster.LinkTo(auditBlock);
broadcaster.LinkTo(alertBlock);

// Кожне повідомлення отримають всі три блоки
broadcaster.Post("Користувач увійшов у систему");
broadcaster.Post("Помилка авторизації");
```

:::warning BroadcastBlock і втрата даних
`BroadcastBlock` зберігає лише **останній** елемент. Якщо підключений блок ще обробляє попередній елемент, новий елемент може бути пропущений. Для гарантованої доставки використовуйте `BufferBlock` після `BroadcastBlock`.
:::

## LinkTo: з'єднання блоків у конвеєр

`LinkTo` — метод для з'єднання двох блоків. Підтримує фільтрацію:

```csharp
var source = new TransformBlock<int, int>(n => n * n);  // квадрати
var evenSink = new ActionBlock<int>(n => Console.WriteLine($"Парний: {n}"));
var oddSink  = new ActionBlock<int>(n => Console.WriteLine($"Непарний: {n}"));
var discardSink = DataflowBlock.NullTarget<int>();  // "кошик" для відхилених

var linkOptions = new DataflowLinkOptions { PropagateCompletion = true };

// Передаємо парні числа в evenSink
source.LinkTo(evenSink, linkOptions, n => n % 2 == 0);

// Передаємо непарні в oddSink
source.LinkTo(oddSink, linkOptions, n => n % 2 != 0);

// Якщо жоден фільтр не підходить — відхиляємо (без NullTarget блок завис би)
source.LinkTo(discardSink);

for (int i = 1; i <= 10; i++) source.Post(i * i);
source.Complete();
```

## DataflowBlockOptions: MaxDegreeOfParallelism та BoundedCapacity

```csharp
var blockOptions = new ExecutionDataflowBlockOptions
{
    // Скільки елементів блок може обробляти одночасно
    MaxDegreeOfParallelism = Environment.ProcessorCount,

    // Максимальна кількість елементів у вхідній черзі блоку
    // DataflowBlockOptions.Unbounded = -1 (без обмежень)
    BoundedCapacity = 50,

    // Токен скасування
    CancellationToken = cts.Token,

    // Мінімальна кількість елементів для запуску обробки (оптимізація пакетної обробки)
    // EnsureOrdered = true  — зберігати порядок виходу (за замовчуванням true)
    EnsureOrdered = false  // вимикаємо для максимальної продуктивності
};
```

| Параметр | Значення | Ефект |
|---|---|---|
| `MaxDegreeOfParallelism = 1` | За замовчуванням | Послідовна обробка |
| `MaxDegreeOfParallelism = N` | N > 1 | Паралельна обробка |
| `BoundedCapacity = -1` | За замовчуванням | Необмежена черга (ризик OOM) |
| `BoundedCapacity = N` | N > 0 | Зворотний тиск, SendAsync блокується |

## Complete() та Completion: коректне завершення конвеєра

Правильне завершення конвеєра — критично важливий аспект:

```csharp
var block1 = new TransformBlock<int, string>(n => n.ToString());
var block2 = new TransformBlock<string, string>(s => s.ToUpper());
var block3 = new ActionBlock<string>(Console.WriteLine);

// PropagateCompletion = true: Complete() автоматично поширюється по ланцюжку
var opts = new DataflowLinkOptions { PropagateCompletion = true };
block1.LinkTo(block2, opts);
block2.LinkTo(block3, opts);

// Надсилаємо дані
for (int i = 0; i < 10; i++) block1.Post(i);

// Сигналізуємо першому блоку про завершення вхідних даних
block1.Complete();

// Чекаємо завершення ОСТАННЬОГО блоку (Complete поширюється автоматично)
await block3.Completion;
Console.WriteLine("Конвеєр завершив роботу");
```

:::danger Завжди чекайте Completion
Без `await block.Completion` програма може завершитись до того, як блок обробить всі елементи. Також завжди використовуйте `PropagateCompletion = true` — інакше підключені блоки ніколи не завершаться.
:::

## Практичний приклад: конвеєр обробки зображень

Розглянемо реалістичний приклад — конвеєр із трьох стадій:

```
[Список файлів] → [Читання] → [Resize] → [Збереження]
                  (IO-bound) (CPU-bound) (IO-bound)
```

```csharp
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading.Tasks.Dataflow;

static async Task ProcessImagesAsync(
    IEnumerable<string> inputFiles,
    string outputDirectory,
    CancellationToken ct = default)
{
    Directory.CreateDirectory(outputDirectory);

    // --- Стадія 1: Читання файлів (IO-bound, до 4 одночасно) ---
    var readBlock = new TransformBlock<string, (string Path, Bitmap Image)>(
        async filePath =>
        {
            Console.WriteLine($"Читаємо: {Path.GetFileName(filePath)}");
            // Завантаження зображення (симуляція через async)
            var image = await Task.Run(() => new Bitmap(filePath));
            return (filePath, image);
        },
        new ExecutionDataflowBlockOptions
        {
            MaxDegreeOfParallelism = 4,
            BoundedCapacity = 8,
            CancellationToken = ct
        }
    );

    // --- Стадія 2: Зміна розміру (CPU-bound, всі ядра) ---
    var resizeBlock = new TransformBlock<(string Path, Bitmap Image), (string Path, Bitmap Resized)>(
        data =>
        {
            Console.WriteLine($"Resize: {Path.GetFileName(data.Path)}");
            var resized = new Bitmap(data.Image, new Size(800, 600));
            data.Image.Dispose();  // звільняємо оригінал
            return (data.Path, resized);
        },
        new ExecutionDataflowBlockOptions
        {
            MaxDegreeOfParallelism = Environment.ProcessorCount,
            BoundedCapacity = 16,
            CancellationToken = ct
        }
    );

    // --- Стадія 3: Збереження (IO-bound, до 4 одночасно) ---
    var saveBlock = new ActionBlock<(string Path, Bitmap Resized)>(
        async data =>
        {
            var fileName = Path.GetFileName(data.Path);
            var outputPath = Path.Combine(outputDirectory, $"thumb_{fileName}");
            Console.WriteLine($"Зберігаємо: {fileName}");
            await Task.Run(() =>
            {
                data.Resized.Save(outputPath, ImageFormat.Jpeg);
                data.Resized.Dispose();
            });
        },
        new ExecutionDataflowBlockOptions
        {
            MaxDegreeOfParallelism = 4,
            BoundedCapacity = 8,
            CancellationToken = ct
        }
    );

    // --- З'єднуємо конвеєр ---
    var linkOpts = new DataflowLinkOptions { PropagateCompletion = true };
    readBlock.LinkTo(resizeBlock, linkOpts);
    resizeBlock.LinkTo(saveBlock, linkOpts);

    // --- Запускаємо: подаємо файли у перший блок ---
    foreach (var file in inputFiles)
    {
        await readBlock.SendAsync(file, ct);
    }

    // --- Завершуємо: чекаємо обробки всіх елементів ---
    readBlock.Complete();
    await saveBlock.Completion;

    Console.WriteLine("Всі зображення оброблено!");
}
```

Цей конвеєр обробляє кожну стадію паралельно: поки `resizeBlock` змінює розміри одних зображень, `readBlock` вже читає наступні, а `saveBlock` зберігає попередні — класичний конвеєрний паралелізм.
