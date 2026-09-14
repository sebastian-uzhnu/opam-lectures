---
sidebar_position: 2
---

# PLINQ: паралельний LINQ

## Що таке PLINQ

**PLINQ (Parallel LINQ)** — це паралельна реалізація LINQ to Objects, вбудована у .NET. Вона автоматично розбиває колекцію на частини, обробляє їх на кількох ядрах і об'єднує результати.

```
Звичайний LINQ:
[елементи] → Where → Select → OrderBy → ToList
(один потік, послідовно)

PLINQ:
[елементи] → Розбивка → ┌ Ядро 1: Where → Select ┐
                         ├ Ядро 2: Where → Select ├ → Об'єднання → OrderBy → ToList
                         └ Ядро 3: Where → Select ┘
(кілька потоків паралельно)
```

## AsParallel() — перетворення LINQ на PLINQ

Достатньо додати `.AsParallel()` у ланцюжок LINQ:

```csharp
int[] numbers = Enumerable.Range(1, 10_000_000).ToArray();

// Звичайний LINQ (послідовний):
var resultSeq = numbers
    .Where(n => n % 2 == 0)
    .Select(n => n * n)
    .ToList();

// PLINQ (паралельний):
var resultPar = numbers
    .AsParallel()           // <-- одне слово перетворює на PLINQ
    .Where(n => n % 2 == 0)
    .Select(n => n * n)
    .ToList();
```

:::info Де ставити AsParallel()
`AsParallel()` викликається на вхідній колекції, до перших операторів LINQ. Всі подальші оператори (Where, Select, GroupBy тощо) автоматично виконуються паралельно.
:::

## WithDegreeOfParallelism

Обмежує кількість потоків, які PLINQ може використати:

```csharp
var result = numbers
    .AsParallel()
    .WithDegreeOfParallelism(4)   // не більше 4 потоків
    .Where(IsPrime)
    .Select(n => n * 2)
    .ToArray();
```

За замовчуванням PLINQ використовує `Environment.ProcessorCount` потоків.

## WithCancellation

Дозволяє скасувати PLINQ-запит через `CancellationToken`:

```csharp
var cts = new CancellationTokenSource();
cts.CancelAfter(TimeSpan.FromSeconds(3));

try
{
    var result = numbers
        .AsParallel()
        .WithCancellation(cts.Token)
        .Where(n => HeavyFilter(n))
        .ToArray();
}
catch (OperationCanceledException)
{
    Console.WriteLine("PLINQ-запит скасовано");
}
```

## WithExecutionMode

Підказує PLINQ, чи варто взагалі паралелізувати запит:

```csharp
var result = numbers
    .AsParallel()
    .WithExecutionMode(ParallelExecutionMode.ForceParallelism) // завжди паралельно
    // або:
    .WithExecutionMode(ParallelExecutionMode.Default)          // за рішенням PLINQ
    .Where(n => n > 100)
    .ToArray();
```

`Default` дозволяє PLINQ самостійно вирішити, чи паралелізувати. Для деяких операторів (наприклад, `First()` на відсортованій колекції) PLINQ може обрати послідовне виконання як більш ефективне.

## AsOrdered() — збереження порядку

PLINQ за замовчуванням не зберігає порядок елементів. Для збереження потрібен `AsOrdered()`:

```csharp
int[] data = Enumerable.Range(1, 20).ToArray();

// Без AsOrdered: порядок результатів непередбачуваний
var unordered = data
    .AsParallel()
    .Select(n => n * n)
    .ToArray();
// Може бути: [4, 1, 16, 9, 25, ...]

// З AsOrdered: порядок збережено
var ordered = data
    .AsParallel()
    .AsOrdered()
    .Select(n => n * n)
    .ToArray();
// Завжди: [1, 4, 9, 16, 25, ...]
```

:::warning Ціна AsOrdered()
`AsOrdered()` змушує PLINQ синхронізувати результати між потоками, що збільшує накладні витрати. Використовуйте лише коли порядок дійсно важливий. Якщо порядок потрібен лише у кінці — краще додати `OrderBy` після збору результатів.
:::

## ForAll() — паралельна кінцева дія

`ForAll()` — аналог `foreach`, але виконує дію паралельно, без зайвої синхронізації порядку:

```csharp
// Звичайний foreach після PLINQ (результати спочатку збираються, потім ітеруються послідовно):
numbers.AsParallel().Where(IsPrime).ToList().ForEach(SaveToDb);

// ForAll (обробляє результати одразу в паралельних потоках, без буферизації):
numbers
    .AsParallel()
    .Where(IsPrime)
    .ForAll(n => SaveToDb(n));  // виконується паралельно без зайвих алокацій
```

:::info ForAll vs foreach
`ForAll` не повертає значення і не зберігає порядок. Він ідеальний для фінальних side-effect операцій (запис у базу, файл тощо), де порядок не важливий.
:::

## Aggregate з паралелізацією

Звичайний `Aggregate` не можна паралелізувати — він послідовний за природою. PLINQ надає спеціальне перевантаження з трьома функціями:

```csharp
int[] numbers = Enumerable.Range(1, 1_000_000).ToArray();

long parallelSum = numbers
    .AsParallel()
    .Aggregate(
        // 1. seed: початкове значення для КОЖНОГО потоку
        seed: 0L,
        // 2. updateAccumulator: як кожен потік накопичує своє часткове значення
        updateAccumulatorFunc: (localSum, n) => localSum + n,
        // 3. combineAccumulators: як об'єднати часткові результати різних потоків
        combineAccumulatorsFunc: (total, localSum) => total + localSum,
        // 4. resultSelector: фінальне перетворення (опційно)
        resultSelector: total => total
    );

Console.WriteLine(parallelSum);  // 500000500000
```

Аналогічно для складніших агрегацій — наприклад, одночасне знаходження суми і кількості:

```csharp
var (sum, count) = numbers
    .AsParallel()
    .Aggregate(
        seed: (Sum: 0L, Count: 0),
        updateAccumulatorFunc: (acc, n) => (acc.Sum + n, acc.Count + 1),
        combineAccumulatorsFunc: (a, b) => (a.Sum + b.Sum, a.Count + b.Count),
        resultSelector: acc => acc
    );

double average = (double)sum / count;
Console.WriteLine($"Середнє: {average}");
```

## Коли PLINQ прискорює, а коли сповільнює

### CPU-bound задачі (PLINQ вигідний)

```csharp
// Перевірка на простоту — важке обчислення
static bool IsPrime(long n)
{
    if (n < 2) return false;
    for (long i = 2; i <= Math.Sqrt(n); i++)
        if (n % i == 0) return false;
    return true;
}

long[] bigNumbers = Enumerable.Range(1_000_000, 100_000)
                               .Select(n => (long)n)
                               .ToArray();

var sw = Stopwatch.StartNew();
var seqPrimes = bigNumbers.Where(IsPrime).ToArray();
Console.WriteLine($"LINQ:  {sw.ElapsedMilliseconds} мс, знайдено {seqPrimes.Length}");

sw.Restart();
var parPrimes = bigNumbers.AsParallel().Where(IsPrime).ToArray();
Console.WriteLine($"PLINQ: {sw.ElapsedMilliseconds} мс, знайдено {parPrimes.Length}");
// LINQ:  850 мс
// PLINQ: 130 мс  (на 8 ядрах)
```

### IO-bound задачі (PLINQ може нашкодити)

```csharp
// ПОГАНО: PLINQ для читання файлів — диск є вузьким місцем, не CPU
var contents = fileNames
    .AsParallel()                          // не дає переваги — IO обмежений диском
    .Select(f => File.ReadAllText(f))      // всі потоки чекають диск
    .ToArray();

// КРАЩЕ: для IO-bound задач використовуйте async/await
var tasks = fileNames.Select(f => File.ReadAllTextAsync(f));
var contents2 = await Task.WhenAll(tasks);
```

:::warning Малі колекції
PLINQ не варто використовувати для колекцій менше кількох тисяч елементів — overhead розбивки і злиття нівелює будь-яке прискорення.
:::

## Обробка винятків у PLINQ

PLINQ збирає всі винятки з усіх потоків і кидає їх як `AggregateException`:

```csharp
int[] data = { 1, 0, 2, 0, 3 };

try
{
    var result = data
        .AsParallel()
        .Select(n =>
        {
            if (n == 0) throw new DivideByZeroException($"Ділення на нуль!");
            return 100 / n;
        })
        .ToArray();
}
catch (AggregateException ae)
{
    // Handle може обробити кожен вняток окремо
    ae.Handle(ex =>
    {
        if (ex is DivideByZeroException dze)
        {
            Console.WriteLine($"Помилка: {dze.Message}");
            return true;  // виняток оброблено
        }
        return false;     // перекинути далі
    });
}
```

:::info AggregateException.Flatten()
Якщо AggregateException містить вкладені AggregateException (таке трапляється при вкладених паралельних операціях), метод `Flatten()` розгортає їх в єдиний плоский список.
:::

## Порівняння: LINQ vs PLINQ на великому масиві

Повний приклад для демонстрації різниці у продуктивності:

```csharp
using System.Diagnostics;

// Генеруємо масив з 5 мільйонів чисел
double[] data = Enumerable.Range(1, 5_000_000)
                           .Select(i => (double)i)
                           .ToArray();

static double HeavyTransform(double x)
{
    // Імітуємо CPU-bound обчислення
    return Math.Sqrt(Math.Sin(x) * Math.Sin(x) + Math.Cos(x) * Math.Cos(x)) * x;
}

// --- LINQ ---
var sw = Stopwatch.StartNew();
var linqResult = data
    .Where(x => x > 100)
    .Select(HeavyTransform)
    .Sum();
sw.Stop();
Console.WriteLine($"LINQ:  {sw.ElapsedMilliseconds} мс  →  {linqResult:F2}");

// --- PLINQ (без збереження порядку) ---
sw.Restart();
var plinqResult = data
    .AsParallel()
    .Where(x => x > 100)
    .Select(HeavyTransform)
    .Sum();
sw.Stop();
Console.WriteLine($"PLINQ: {sw.ElapsedMilliseconds} мс  →  {plinqResult:F2}");

// --- PLINQ (зі збереженням порядку — повільніше) ---
sw.Restart();
var plinqOrdered = data
    .AsParallel()
    .AsOrdered()
    .Where(x => x > 100)
    .Select(HeavyTransform)
    .Sum();
sw.Stop();
Console.WriteLine($"PLINQ AsOrdered: {sw.ElapsedMilliseconds} мс  →  {plinqOrdered:F2}");

// Зразковий результат на 8-ядерному CPU:
// LINQ:            1240 мс
// PLINQ:            195 мс  (≈6.4x прискорення)
// PLINQ AsOrdered:  310 мс  (≈4x прискорення, але з гарантованим порядком)
```

Результати показують, що PLINQ дає суттєве прискорення для важких CPU-bound операцій. `AsOrdered()` трохи гальмує через накладні витрати синхронізації, але все одно значно швидше за послідовний LINQ.
