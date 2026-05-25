---
sidebar_position: 3
---

# Interlocked та потокобезпечні колекції

## Interlocked: атомарні операції без lock

Клас `System.Threading.Interlocked` надає **атомарні** операції над числовими типами та посиланнями. Атомарна операція виконується як єдине неподільне ціле — жоден інший потік не може "вклинитись" посередині.

:::info Що таке атомарність?
Процесор виконує `Interlocked.Increment` за допомогою спеціальної інструкції `LOCK XADD` (x86), яка апаратно гарантує атомарність. Це набагато швидше, ніж захоплення `lock` (Monitor), бо не потребує переходу в режим ядра ОС.
:::

### `Interlocked.Increment` та `Decrement`

```csharp
using System.Threading;

class InterlockedDemo
{
    private static int _counter = 0;
    private static int _activeConnections = 0;

    // Безпечний лічильник без lock
    public static int GetNext() => Interlocked.Increment(ref _counter);

    // Відстеження активних підключень
    public static void OnConnect()    => Interlocked.Increment(ref _activeConnections);
    public static void OnDisconnect() => Interlocked.Decrement(ref _activeConnections);
    public static int  ActiveCount   => Interlocked.CompareExchange(ref _activeConnections, 0, 0);

    static void Main()
    {
        var tasks = new Task[10];
        for (int i = 0; i < 10; i++)
        {
            tasks[i] = Task.Run(() =>
            {
                for (int j = 0; j < 100_000; j++)
                    Interlocked.Increment(ref _counter);
            });
        }
        Task.WaitAll(tasks);
        Console.WriteLine($"Результат: {_counter}"); // Завжди: 1 000 000
    }
}
```

### `Interlocked.Add`

```csharp
class StatisticsTracker
{
    private static long _totalBytesProcessed = 0;

    public static void ReportProcessed(long bytes)
    {
        // Потокобезпечне додавання — повертає нове значення
        long newTotal = Interlocked.Add(ref _totalBytesProcessed, bytes);
        Console.WriteLine($"Оброблено загалом: {newTotal} байт");
    }
}
```

### `Interlocked.Exchange`

Атомарно **замінює** значення і повертає **попереднє**:

```csharp
class SpinLockExample
{
    // 0 = вільно, 1 = зайнято
    private static int _lockFlag = 0;

    public static void DoExclusive(Action action)
    {
        // Spin-lock: крутимось, поки не захопимо
        while (Interlocked.Exchange(ref _lockFlag, 1) == 1)
            Thread.SpinWait(10); // не звільняємо процесор повністю

        try
        {
            action();
        }
        finally
        {
            Interlocked.Exchange(ref _lockFlag, 0); // звільняємо
        }
    }
}
```

### `Interlocked.CompareExchange` (CAS — Compare-And-Swap)

Найпотужніша операція: **атомарно** перевіряє значення і замінює, лише якщо воно дорівнює очікуваному:

```csharp
class LazyInitExample
{
    private static string? _expensiveResource = null;

    // Lock-free ліниве ініціалізування
    public static string GetResource()
    {
        if (_expensiveResource != null)
            return _expensiveResource;

        var newResource = CreateExpensiveResource(); // може викликатись кількома потоками

        // Записуємо, лише якщо поле досі null (перший потік виграє)
        var previous = Interlocked.CompareExchange(
            ref _expensiveResource,
            newResource,  // нове значення
            null          // очікуване поточне значення
        );

        // Якщо previous != null — інший потік вже встиг ініціалізувати
        return _expensiveResource!;
    }

    private static string CreateExpensiveResource() => "Ресурс створено о " + DateTime.Now;
}
```

### Порівняння: `lock` vs `Interlocked`

```csharp
// Тест швидкодії: 10 000 000 інкрементів
class BenchmarkCounter
{
    static int _withLock = 0;
    static int _withInterlocked = 0;
    static readonly object _lock = new();

    static void Main()
    {
        const int iterations = 10_000_000;

        // З lock
        var sw = System.Diagnostics.Stopwatch.StartNew();
        Parallel.For(0, iterations, _ =>
        {
            lock (_lock) { _withLock++; }
        });
        sw.Stop();
        Console.WriteLine($"lock:        {sw.ElapsedMilliseconds} мс");

        // З Interlocked
        sw.Restart();
        Parallel.For(0, iterations, _ =>
        {
            Interlocked.Increment(ref _withInterlocked);
        });
        sw.Stop();
        Console.WriteLine($"Interlocked: {sw.ElapsedMilliseconds} мс");
        // Interlocked зазвичай у 3-5 разів швидший
    }
}
```

---

## ConcurrentDictionary\<K, V\>

Стандартний `Dictionary<K,V>` **не є потокобезпечним**. При одночасній модифікації з кількох потоків він може пошкодити свою внутрішню структуру.

`ConcurrentDictionary<K,V>` — потокобезпечна альтернатива з атомарними операціями:

### Ключові методи

```csharp
using System.Collections.Concurrent;

class ConcurrentDictionaryDemo
{
    static void Main()
    {
        var dict = new ConcurrentDictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        // TryAdd — безпечне додавання
        bool added = dict.TryAdd("apple", 1);
        Console.WriteLine($"Додано: {added}"); // true

        // TryGetValue — безпечне читання
        if (dict.TryGetValue("apple", out int count))
            Console.WriteLine($"apple: {count}");

        // TryRemove — безпечне видалення
        if (dict.TryRemove("apple", out int removed))
            Console.WriteLine($"Видалено значення: {removed}");

        // GetOrAdd — атомарно отримати або додати
        // Якщо "banana" відсутній — додає зі значенням 0
        int bananaCount = dict.GetOrAdd("banana", 0);

        // GetOrAdd з фабрикою — фабрика викликається лише якщо ключ відсутній
        var userProfile = dict.GetOrAdd("charlie", key =>
        {
            Console.WriteLine($"Створюємо профіль для {key}");
            return key.Length; // якесь обчислення
        });

        // AddOrUpdate — атомарно додати або оновити
        // Якщо "banana" є — викликає updateFactory
        int newCount = dict.AddOrUpdate(
            key: "banana",
            addValue: 1,                           // якщо ключа немає
            updateValueFactory: (key, old) => old + 1  // якщо ключ є
        );
        Console.WriteLine($"banana: {newCount}");
    }
}
```

### Практичний приклад: підрахунок слів

```csharp
class WordCounter
{
    public static ConcurrentDictionary<string, int> CountWords(string[] texts)
    {
        var counts = new ConcurrentDictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        Parallel.ForEach(texts, text =>
        {
            var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            foreach (var word in words)
            {
                // Атомарно: якщо слово нове — додаємо з 1, якщо є — +1
                counts.AddOrUpdate(word, 1, (_, old) => old + 1);
            }
        });

        return counts;
    }

    static void Main()
    {
        string[] texts =
        {
            "hello world hello",
            "world is beautiful",
            "hello beautiful day"
        };

        var result = CountWords(texts);
        foreach (var (word, count) in result.OrderByDescending(x => x.Value))
            Console.WriteLine($"{word}: {count}");
    }
}
```

### Dictionary + lock vs ConcurrentDictionary

```csharp
// Підхід 1: Dictionary + lock
class DictionaryWithLock
{
    private readonly Dictionary<int, string> _dict = new();
    private readonly object _lock = new();

    public string GetOrAdd(int key, string value)
    {
        lock (_lock) // весь словник заблокований — читання теж чекають!
        {
            if (!_dict.TryGetValue(key, out string? existing))
            {
                _dict[key] = value;
                return value;
            }
            return existing;
        }
    }
}

// Підхід 2: ConcurrentDictionary — краще для read-heavy scenarios
class DictionaryWithConcurrent
{
    private readonly ConcurrentDictionary<int, string> _dict = new();

    public string GetOrAdd(int key, string value) =>
        _dict.GetOrAdd(key, value); // внутрішня сегментація — менше суперечок
}
```

:::info Коли ConcurrentDictionary ефективніший?
`ConcurrentDictionary` розбиває свій внутрішній масив на **сегменти** (за замовчуванням їх стільки, скільки логічних ядер процесора). Операції на різних сегментах не блокують одна одну. Для сценаріїв з переважаючим читанням — це набагато ефективніше, ніж `Dictionary + lock`.
:::

---

## ConcurrentQueue\<T\>

**`ConcurrentQueue<T>`** — потокобезпечна черга FIFO (first-in, first-out) для класичного патерну producer-consumer:

```csharp
class ConcurrentQueueDemo
{
    static readonly ConcurrentQueue<string> _queue = new();

    static void Main()
    {
        // Виробники: 3 потоки додають завдання
        var producers = Enumerable.Range(1, 3).Select(id => Task.Run(() =>
        {
            for (int i = 1; i <= 5; i++)
            {
                string task = $"Завдання {id}-{i}";
                _queue.Enqueue(task);
                Console.WriteLine($"[Вироблено] {task}");
                Thread.Sleep(Random.Shared.Next(50, 150));
            }
        }));

        // Споживач: один потік обробляє завдання
        var consumer = Task.Run(async () =>
        {
            int processed = 0;
            while (processed < 15) // 3 виробники × 5 завдань
            {
                if (_queue.TryDequeue(out string? task))
                {
                    Console.WriteLine($"[Оброблено] {task}");
                    processed++;
                }
                else
                {
                    await Task.Delay(10); // черга порожня — чекаємо
                }
            }
        });

        Task.WaitAll([..producers, consumer]);
    }
}
```

:::tip `TryDequeue` замість `Count > 0`
Ніколи не пишіть `if (queue.Count > 0) queue.TryDequeue(...)` — між перевіркою `Count` і викликом `TryDequeue` інший потік може випустити елемент. Завжди просто викликайте `TryDequeue` і перевіряйте повернене `bool`.
:::

---

## ConcurrentBag\<T\>

**`ConcurrentBag<T>`** — потокобезпечний **невпорядкований** набір. Оптимізований для сценаріїв, де **той самий потік** і додає, і витягує елементи (наприклад, пул об'єктів):

```csharp
class ObjectPool<T>
{
    private readonly ConcurrentBag<T> _pool = new();
    private readonly Func<T> _factory;

    public ObjectPool(Func<T> factory) => _factory = factory;

    public T Rent() =>
        _pool.TryTake(out T? item) ? item : _factory();

    public void Return(T item) => _pool.Add(item);
}

// Використання: пул StringBuilder для уникнення частого виділення пам'яті
class StringBuilderPool
{
    private static readonly ObjectPool<System.Text.StringBuilder> _pool =
        new(() => new System.Text.StringBuilder(256));

    public static string BuildString(Action<System.Text.StringBuilder> action)
    {
        var sb = _pool.Rent();
        sb.Clear();
        try
        {
            action(sb);
            return sb.ToString();
        }
        finally
        {
            _pool.Return(sb); // повертаємо в пул
        }
    }
}
```

---

## ConcurrentStack\<T\>

**`ConcurrentStack<T>`** — потокобезпечний стек LIFO:

```csharp
class ConcurrentStackDemo
{
    static void Main()
    {
        var stack = new ConcurrentStack<int>();

        // PushRange — пакетне додавання (атомарно)
        stack.PushRange(new[] { 1, 2, 3, 4, 5 });

        // TryPop — витягнути один елемент
        if (stack.TryPop(out int top))
            Console.WriteLine($"TryPop: {top}"); // 5

        // TryPopRange — пакетне витягнення
        var buffer = new int[3];
        int popped = stack.TryPopRange(buffer);
        Console.WriteLine($"TryPopRange ({popped} елементів): {string.Join(", ", buffer[..popped])}");

        // TryPeek — підглянути без видалення
        if (stack.TryPeek(out int peek))
            Console.WriteLine($"TryPeek: {peek}"); // 1
    }
}
```

---

## BlockingCollection\<T\>: блокуюча черга

**`BlockingCollection<T>`** — найпотужніший інструмент для паттерну producer-consumer. Автоматично **блокує** споживача, якщо черга порожня, і **блокує** виробника, якщо черга переповнена.

```csharp
class BlockingCollectionDemo
{
    // Черга з обмеженням: не більше 10 елементів одночасно
    static readonly BlockingCollection<string> _queue =
        new BlockingCollection<string>(boundedCapacity: 10);

    static void Main()
    {
        // Виробник
        var producer = Task.Run(() =>
        {
            for (int i = 1; i <= 20; i++)
            {
                string item = $"Елемент {i}";
                _queue.Add(item); // блокується якщо черга повна (>= 10)
                Console.WriteLine($"[+] Додано: {item} (в черзі: {_queue.Count})");
                Thread.Sleep(50);
            }
            _queue.CompleteAdding(); // сигналізуємо: більше нічого не буде
        });

        // Споживач — GetConsumingEnumerable автоматично завершується при CompleteAdding
        var consumer = Task.Run(() =>
        {
            foreach (string item in _queue.GetConsumingEnumerable())
            {
                // Блокується, якщо черга порожня, і виходить при CompleteAdding
                Console.WriteLine($"[-] Оброблено: {item}");
                Thread.Sleep(150); // споживач повільніший — черга заповниться
            }
            Console.WriteLine("Споживач завершив роботу");
        });

        Task.WaitAll(producer, consumer);
    }
}
```

### Pipeline з кількома BlockingCollection

```csharp
class PipelineDemo
{
    static void Main()
    {
        var stage1 = new BlockingCollection<int>(5);
        var stage2 = new BlockingCollection<string>(5);

        // Етап 1: генерація чисел
        Task.Run(() =>
        {
            for (int i = 1; i <= 10; i++)
            {
                stage1.Add(i);
                Console.WriteLine($"[Етап 1] Згенеровано: {i}");
            }
            stage1.CompleteAdding();
        });

        // Етап 2: перетворення
        Task.Run(() =>
        {
            foreach (int num in stage1.GetConsumingEnumerable())
            {
                string result = $"число_{num * num}"; // зводимо в квадрат
                stage2.Add(result);
                Console.WriteLine($"[Етап 2] Перетворено: {result}");
            }
            stage2.CompleteAdding();
        });

        // Етап 3: виведення результатів
        foreach (string result in stage2.GetConsumingEnumerable())
            Console.WriteLine($"[Результат] {result}");
    }
}
```

---

## ImmutableCollections: незмінні колекції

Для сценаріїв із переважаючим читанням і рідкісним оновленням можна використовувати **незмінні колекції** з пакету `System.Collections.Immutable`. Будь-яка "зміна" повертає **новий** об'єкт — оригінал залишається незмінним:

```csharp
using System.Collections.Immutable;

class ImmutableDemo
{
    // Спільна конфігурація: читається постійно, оновлюється рідко
    private static volatile ImmutableDictionary<string, string> _config =
        ImmutableDictionary<string, string>.Empty;

    // Оновлення — thread-safe завдяки volatile + незмінності
    public static void UpdateConfig(string key, string value)
    {
        // Спроба CAS-оновлення без lock
        ImmutableDictionary<string, string> original, updated;
        do
        {
            original = _config;
            updated = original.SetItem(key, value);
            // Повторюємо, якщо інший потік змінив _config поки ми обчислювали
        } while (Interlocked.CompareExchange(ref _config!, updated, original) != original);
    }

    // Читання — завжди безпечне, без lock
    public static string? GetConfig(string key) =>
        _config.TryGetValue(key, out string? value) ? value : null;
}
```

:::tip Коли використовувати Immutable Collections?
- Конфігурації, що рідко змінюються
- Списки дозволів/заборон (allow/deny lists)
- Snapshots стану для undo/redo
- Коли потрібно передати "знімок" даних між потоками без копіювання

**Не підходять** для: часто змінюваних структур даних — кожна зміна створює новий об'єкт, що навантажує GC.
:::

---

## Зведена таблиця: вибір потокобезпечної колекції

| Колекція | Аналог | Порядок | Async | Блокування | Коли використовувати |
|---|---|---|---|---|---|
| `ConcurrentQueue<T>` | `Queue<T>` | FIFO | Ні | Ні | Потокобезпечна черга, producer-consumer |
| `ConcurrentStack<T>` | `Stack<T>` | LIFO | Ні | Ні | Потокобезпечний стек |
| `ConcurrentBag<T>` | `List<T>` | Довільний | Ні | Ні | Пул об'єктів, той самий потік додає/бере |
| `ConcurrentDictionary<K,V>` | `Dictionary<K,V>` | За ключем | Ні | Ні | Спільний словник, часте читання |
| `BlockingCollection<T>` | — | Залежить від внутрішньої | Ні | **Так** | Producer-consumer з контролем об'єму |
| `ImmutableList<T>` / `ImmutableDictionary<K,V>` | `List<T>` / `Dictionary<K,V>` | — | Так | Ні | Read-heavy, рідкісні оновлення |
