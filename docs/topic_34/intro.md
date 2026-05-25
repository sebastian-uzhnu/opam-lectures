---
sidebar_position: 1
---

# Parallel.For та Parallel.ForEach

## Паралелізм vs Конкурентність

Ці два терміни часто плутають, але вони описують різні речі:

```
КОНКУРЕНТНІСТЬ (Concurrency)
Один процесор, кілька задач чергуються:

CPU:  [Task A]--[Task B]--[Task A]--[Task C]--[Task B]--[Task A]
      ────────────────────────────────────────────────────────────▶ час
      Задачі здаються одночасними, але насправді чергуються


ПАРАЛЕЛІЗМ (Parallelism)
Кілька процесорів, справжня одночасність:

CPU1: [Task A]──────────────────────────────────────
CPU2: [Task B]──────────────────────────────────────
CPU3: [Task C]──────────────────────────────────────
      ────────────────────────────────────────────────▶ час
      Задачі виконуються буквально одночасно
```

| Характеристика | Конкурентність | Паралелізм |
|---|---|---|
| Кількість ядер | 1+ (логічна одночасність) | 2+ (фізична одночасність) |
| Мета | Відзивчивість (UI не замерзає) | Швидкість (скорочення часу) |
| Типові задачі | IO-bound (мережа, диск) | CPU-bound (обчислення) |
| Інструменти .NET | `async/await`, `Task` | `Parallel`, `PLINQ` |

:::info Ключовий висновок
`async/await` — це конкурентність для IO-bound задач. `Parallel` та `PLINQ` — це паралелізм для CPU-bound задач. Змішувати їх без розуміння — джерело багів.
:::

## Клас Parallel

`System.Threading.Tasks.Parallel` — статичний клас, що надає три основних методи для паралельного виконання:

```
Parallel
   ├── For(int from, int to, body)          — паралельний цикл for
   ├── ForEach(source, body)                — паралельний foreach
   └── Invoke(action1, action2, ...)        — кілька дій одночасно
```

Клас автоматично розподіляє роботу між ядрами процесора через `ThreadPool`. Він сам вирішує, скільки потоків використати, — але це можна контролювати через `ParallelOptions`.

## Parallel.For

### Базовий синтаксис

```csharp
// Звичайний for:
for (int i = 0; i < 10; i++)
{
    Console.WriteLine($"Ітерація {i}");
}

// Паралельний аналог:
Parallel.For(0, 10, i =>
{
    Console.WriteLine($"Ітерація {i} на потоці {Thread.CurrentThread.ManagedThreadId}");
});
```

:::warning Порядок не гарантований
`Parallel.For` не гарантує порядок виконання ітерацій. Якщо вивести числа 0–9, вони з'являться у довільному порядку — різні потоки виконують різні ітерації одночасно.
:::

### ParallelOptions

`ParallelOptions` дозволяє налаштувати поведінку паралельного циклу:

```csharp
var options = new ParallelOptions
{
    // Максимальна кількість одночасних потоків (-1 = необмежено)
    MaxDegreeOfParallelism = Environment.ProcessorCount,

    // Токен для скасування циклу
    CancellationToken = cancellationTokenSource.Token,

    // Конкретний планувальник задач (рідко потрібно)
    TaskScheduler = TaskScheduler.Default
};

Parallel.For(0, 1_000_000, options, i =>
{
    // важке обчислення
    ProcessItem(i);
});
```

**`MaxDegreeOfParallelism`** — найважливіший параметр:

| Значення | Поведінка |
|---|---|
| `-1` (за замовчуванням) | Використовує стільки потоків, скільки вважає за потрібне |
| `1` | Фактично послідовне виконання (корисно для налагодження) |
| `Environment.ProcessorCount` | Рівно стільки потоків, скільки логічних ядер |
| `Environment.ProcessorCount / 2` | Половина ядер (щоб не перевантажувати систему) |

### Parallel.For зі скасуванням

```csharp
using System.Threading;

var cts = new CancellationTokenSource();

// Скасувати через 2 секунди
cts.CancelAfter(TimeSpan.FromSeconds(2));

var options = new ParallelOptions { CancellationToken = cts.Token };

try
{
    Parallel.For(0, 10_000_000, options, i =>
    {
        // Перевіряємо скасування вручну (опційно, але рекомендовано)
        options.CancellationToken.ThrowIfCancellationRequested();

        HeavyComputation(i);
    });
}
catch (OperationCanceledException)
{
    Console.WriteLine("Паралельний цикл скасовано!");
}
```

:::tip ThrowIfCancellationRequested
Parallel.For автоматично перевіряє токен між ітераціями, але якщо одна ітерація дуже довга, доцільно перевіряти вручну всередині тіла циклу.
:::

## Parallel.ForEach

`Parallel.ForEach` обробляє будь-яку колекцію `IEnumerable<T>` паралельно:

```csharp
var files = Directory.GetFiles(@"C:\Images", "*.jpg");

Parallel.ForEach(files, filePath =>
{
    var image = LoadImage(filePath);
    var resized = ResizeImage(image, 800, 600);
    SaveImage(resized, filePath + "_thumb.jpg");
    Console.WriteLine($"Оброблено: {Path.GetFileName(filePath)}");
});
```

### ForEach з ParallelOptions та локальним станом

Для агрегації результатів (наприклад, суми) без гонки даних є перевантаження з локальним станом:

```csharp
long totalBytes = 0;
var files = Directory.GetFiles(@"C:\Data");

Parallel.ForEach(
    files,
    // Ініціалізація локального стану для кожного потоку
    localInit: () => 0L,
    // Тіло: повертає оновлений локальний стан
    body: (file, loopState, localSum) =>
    {
        var info = new FileInfo(file);
        return localSum + info.Length;   // кожен потік накопичує свою суму
    },
    // Фіналізація: об'єднуємо локальні стани потоків атомарно
    localFinally: localSum =>
    {
        Interlocked.Add(ref totalBytes, localSum);
    }
);

Console.WriteLine($"Загальний розмір: {totalBytes / 1024 / 1024} МБ");
```

:::warning Race Condition
Ніколи не змінюйте спільну змінну всередині `Parallel.ForEach` без синхронізації! Використовуйте або `Interlocked`, або шаблон з локальним станом (показано вище).
:::

## Parallel.Invoke

Запускає кілька незалежних дій паралельно і чекає завершення всіх:

```csharp
Parallel.Invoke(
    () => ProcessRegionA(data),
    () => ProcessRegionB(data),
    () => ProcessRegionC(data),
    () => GenerateReport(data)
);

// Ця рядок виконується лише після завершення ВСІХ чотирьох дій
Console.WriteLine("Всі задачі завершено");
```

Це аналог `Task.WhenAll`, але для синхронного коду. Кількість дій не обмежена.

## ParallelLoopResult: IsCompleted і LowestBreakIteration

`Parallel.For` і `Parallel.ForEach` повертають `ParallelLoopResult`:

```csharp
ParallelLoopResult result = Parallel.For(0, 1000, (i, loopState) =>
{
    if (CheckCondition(i))
    {
        loopState.Break();   // перервати після поточної ітерації
    }
    ProcessItem(i);
});

Console.WriteLine($"Завершено повністю: {result.IsCompleted}");
Console.WriteLine($"Перерваний на ітерації: {result.LowestBreakIteration}");
// IsCompleted = false, якщо було Break() або Stop()
// LowestBreakIteration = найменший індекс, на якому викликали Break()
```

## Break vs Stop у Parallel loops

Ці два методи `ParallelLoopState` поводяться по-різному:

```csharp
// BREAK: "зупинитись після обробки всіх ітерацій з меншим індексом"
Parallel.For(0, 100, (i, state) =>
{
    if (i == 50) state.Break();
    // Ітерації 0–49 ГАРАНТОВАНО будуть виконані
    // Ітерації 51–99 можуть виконатись або ні (залежно від планувальника)
});

// STOP: "зупинитись якнайшвидше, ігноруючи порядок"
Parallel.For(0, 100, (i, state) =>
{
    if (i == 50) state.Stop();
    // Жодних гарантій щодо інших ітерацій — зупиняємось НЕГАЙНО
});
```

| Метод | Гарантія | Коли використовувати |
|---|---|---|
| `Break()` | Всі ітерації < LowestBreakIteration виконаються | Пошук: потрібен найменший відповідний елемент |
| `Stop()` | Ніяких — якнайшвидша зупинка | Перевірка існування: достатньо будь-якого збігу |

## Коли НЕ варто використовувати Parallel

`Parallel` має накладні витрати: створення потоків, розподіл роботи, синхронізація результатів. Для малих колекцій це може бути **повільніше** за звичайний цикл:

```csharp
using System.Diagnostics;

var data = Enumerable.Range(0, 100).ToArray();  // лише 100 елементів!

var sw = Stopwatch.StartNew();
foreach (var x in data) Thread.Sleep(0);  // дуже швидка операція
sw.Stop();
Console.WriteLine($"Sequential: {sw.ElapsedMilliseconds} мс");

sw.Restart();
Parallel.ForEach(data, x => Thread.Sleep(0));
sw.Stop();
Console.WriteLine($"Parallel:   {sw.ElapsedMilliseconds} мс");
// Parallel буде повільніше через overhead планувальника!
```

:::danger Не паралельте все підряд
Паралелізм вигідний лише коли:
1. Колекція велика (тисячі і більше елементів)
2. Кожна ітерація виконує **реальну CPU-роботу** (обчислення, стиснення, шифрування)
3. Ітерації **незалежні** одна від одної (немає спільного стану)

Для IO-bound задач (читання файлів, HTTP-запити) використовуйте `async/await`, а не `Parallel`.
:::

## Порівняння: foreach vs Parallel.ForEach

Розглянемо реалістичний приклад — обчислення чисел Фібоначчі для великого масиву:

```csharp
using System.Diagnostics;

static long Fib(int n)
{
    if (n <= 1) return n;
    long a = 0, b = 1;
    for (int i = 2; i <= n; i++) { long c = a + b; a = b; b = c; }
    return b;
}

int[] inputs = Enumerable.Range(30, 1000).ToArray();  // 1000 чисел Фібоначчі
long[] results = new long[inputs.Length];

// Послідовний підхід
var sw = Stopwatch.StartNew();
for (int i = 0; i < inputs.Length; i++)
{
    results[i] = Fib(inputs[i]);
}
sw.Stop();
Console.WriteLine($"Sequential: {sw.ElapsedMilliseconds} мс");

// Паралельний підхід
sw.Restart();
Parallel.For(0, inputs.Length, i =>
{
    results[i] = Fib(inputs[i]);   // безпечно: кожен i унікальний
});
sw.Stop();
Console.WriteLine($"Parallel:   {sw.ElapsedMilliseconds} мс");

// Зразковий результат на 8-ядерному процесорі:
// Sequential: 142 мс
// Parallel:    23 мс  (≈6x прискорення)
```

:::tip Прискорення не дорівнює кількості ядер
Теоретичний максимум прискорення дорівнює кількості ядер (закон Амдала). На практиці прискорення менше через накладні витрати і те, що частина коду залишається послідовною.
:::
