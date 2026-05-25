---
sidebar_position: 2
---

# Mutex, Semaphore, ReaderWriterLock

## Mutex: між-процесна синхронізація

**`Mutex`** (mutual exclusion — взаємне виключення) — примітив синхронізації, схожий на `lock`, але з однією ключовою відмінністю: він працює **між процесами**, а не лише між потоками в одному процесі.

### Анонімний Mutex (в межах одного процесу)

```csharp
class MutexDemo
{
    // false — не захоплювати одразу при створенні
    private static readonly Mutex _mutex = new Mutex(false);

    static void Main()
    {
        var threads = new Thread[3];
        for (int i = 0; i < 3; i++)
        {
            int threadId = i;
            threads[i] = new Thread(() => DoWork(threadId));
            threads[i].Start();
        }

        foreach (var t in threads)
            t.Join();
    }

    static void DoWork(int id)
    {
        Console.WriteLine($"Потік {id}: чекає на Mutex...");
        _mutex.WaitOne(); // блокуємось, поки Mutex не стане вільним
        try
        {
            Console.WriteLine($"Потік {id}: увійшов у захищену секцію");
            Thread.Sleep(500); // імітуємо роботу
            Console.WriteLine($"Потік {id}: виходить");
        }
        finally
        {
            _mutex.ReleaseMutex(); // ОБОВ'ЯЗКОВО звільняємо в finally
        }
    }
}
```

### Named Mutex: між-процесна синхронізація

Named Mutex дозволяє двом різним процесам (програмам) синхронізуватись через однакове ім'я:

```csharp
// Перший екземпляр програми — отримує дозвіл запуску
class SingleInstanceApp
{
    private static Mutex? _instanceMutex;

    static void Main()
    {
        // Спробувати створити іменований Mutex
        _instanceMutex = new Mutex(
            initiallyOwned: true,
            name: "Global\\MyUniqueAppName_v1",
            out bool createdNew
        );

        if (!createdNew)
        {
            Console.WriteLine("Програма вже запущена! Завершення.");
            return;
        }

        try
        {
            Console.WriteLine("Перший екземпляр запущено. Натисніть Enter для виходу.");
            Console.ReadLine();
        }
        finally
        {
            _instanceMutex.ReleaseMutex();
            _instanceMutex.Dispose();
        }
    }
}
```

:::tip Префікс "Global\\"
Префікс `Global\\` робить Mutex видимим для всіх сесій Windows (включно з різними користувачами). Без префіксу Mutex існує лише в межах поточної сесії.
:::

:::warning Mutex vs lock — що вибрати?
- Якщо вам потрібна синхронізація лише між потоками **одного процесу** — завжди використовуйте `lock`. Він набагато швидший (мікросекунди проти мілісекунд).
- `Mutex` має сенс лише коли потрібна **між-процесна** синхронізація.
:::

---

## Semaphore та SemaphoreSlim

**`Semaphore`** — примітив синхронізації, який дозволяє **N потокам** одночасно отримати доступ до ресурсу. Це схоже на вхід у ліфт: якщо ліфт вміщує 5 осіб — 6-й мусить чекати, доки хтось не вийде.

```
Semaphore(3): дозволяє одночасно 3 потоки

Потік 1 → входить [████░░] 1/3
Потік 2 → входить [████░░] 2/3
Потік 3 → входить [██████] 3/3 (повний!)
Потік 4 → чекає...  ⏳
Потік 5 → чекає...  ⏳

Потік 1 → виходить [████░░] 2/3
Потік 4 → входить  [██████] 3/3
```

### `SemaphoreSlim`: обмеження паралельних операцій

**`SemaphoreSlim`** — легша версія для роботи **в межах одного процесу**. Підтримує асинхронне очікування (`WaitAsync`).

```csharp
class ConnectionPoolDemo
{
    // Максимум 3 одночасних підключення до бази даних
    private static readonly SemaphoreSlim _semaphore = new SemaphoreSlim(
        initialCount: 3,    // початкова кількість дозволів
        maxCount: 3         // максимальна кількість дозволів
    );

    static async Task Main()
    {
        Console.WriteLine("Запуск 8 паралельних запитів...");

        var tasks = Enumerable.Range(1, 8)
            .Select(id => QueryDatabaseAsync(id));

        await Task.WhenAll(tasks);
        Console.WriteLine("Всі запити виконано");
    }

    static async Task QueryDatabaseAsync(int requestId)
    {
        Console.WriteLine($"Запит {requestId}: чекає на підключення...");

        await _semaphore.WaitAsync(); // асинхронне очікування (не блокує потік!)
        try
        {
            Console.WriteLine($"Запит {requestId}: отримав підключення, виконує запит...");
            await Task.Delay(1000); // імітуємо запит до БД
            Console.WriteLine($"Запит {requestId}: завершено");
        }
        finally
        {
            _semaphore.Release(); // ОБОВ'ЯЗКОВО звільняємо
        }
    }
}
```

### Rate Limiting з SemaphoreSlim

```csharp
class RateLimiter
{
    // Дозволяємо не більше 5 запитів одночасно до зовнішнього API
    private readonly SemaphoreSlim _throttle = new SemaphoreSlim(5, 5);

    public async Task<string> CallExternalApiAsync(string url)
    {
        await _throttle.WaitAsync();
        try
        {
            using var client = new HttpClient();
            return await client.GetStringAsync(url);
        }
        finally
        {
            _throttle.Release();
        }
    }
}
```

:::tip `WaitAsync()` vs `Wait()`
У асинхронному коді (`async/await`) завжди використовуйте `_semaphore.WaitAsync()`, а не `_semaphore.Wait()`. Синхронний `Wait()` блокує **потік** (Thread Pool), а `WaitAsync()` лише призупиняє **coroutine**, звільняючи потік для іншої роботи.
:::

---

## ReaderWriterLockSlim: читачі паралельно, письменники ексклюзивно

Уявіть словник, з якого 100 потоків постійно читають і лише 1 раз на хвилину хтось додає новий запис. Якщо використовувати звичайний `lock`, всі читачі вишикуються в чергу, хоча одночасне читання абсолютно безпечне.

**`ReaderWriterLockSlim`** вирішує цю проблему:
- **Кілька читачів** можуть отримати доступ **одночасно**
- **Письменник** отримує **ексклюзивний** доступ — всі читачі та інші письменники чекають

```
Стан: ніхто не працює
 → Читач 1 входить  [R1        ] читання
 → Читач 2 входить  [R1, R2    ] читання (паралельно!)
 → Читач 3 входить  [R1, R2, R3] читання (паралельно!)
 → Письменник чекає ⏳ (поки всі читачі не вийдуть)
 → Читачі виходять
 → Письменник входить [W        ] запис (ексклюзивно)
```

### Основні методи

```csharp
class CacheWithRWLock
{
    private readonly ReaderWriterLockSlim _rwLock = new ReaderWriterLockSlim();
    private readonly Dictionary<string, string> _cache = new Dictionary<string, string>();

    // Читання — дозволяємо кільком потокам одночасно
    public string? Get(string key)
    {
        _rwLock.EnterReadLock();
        try
        {
            _cache.TryGetValue(key, out string? value);
            return value;
        }
        finally
        {
            _rwLock.ExitReadLock();
        }
    }

    // Запис — ексклюзивний доступ
    public void Set(string key, string value)
    {
        _rwLock.EnterWriteLock();
        try
        {
            _cache[key] = value;
        }
        finally
        {
            _rwLock.ExitWriteLock();
        }
    }

    // Видалення — також ексклюзивний доступ
    public bool Remove(string key)
    {
        _rwLock.EnterWriteLock();
        try
        {
            return _cache.Remove(key);
        }
        finally
        {
            _rwLock.ExitWriteLock();
        }
    }

    public int Count
    {
        get
        {
            _rwLock.EnterReadLock();
            try { return _cache.Count; }
            finally { _rwLock.ExitReadLock(); }
        }
    }
}
```

### UpgradeableReadLock: підвищення рівня доступу

Іноді потрібно спочатку **прочитати** значення, а потім — залежно від результату — **записати**. Для цього є `EnterUpgradeableReadLock`:

```csharp
class CacheWithUpgrade
{
    private readonly ReaderWriterLockSlim _rwLock = new ReaderWriterLockSlim();
    private readonly Dictionary<string, string> _cache = new();

    // GetOrAdd: повертає існуюче або обчислює та зберігає нове значення
    public string GetOrAdd(string key, Func<string, string> factory)
    {
        // Спочатку — читаємо (паралельно з іншими читачами)
        _rwLock.EnterUpgradeableReadLock();
        try
        {
            if (_cache.TryGetValue(key, out string? existing))
                return existing; // знайшли — повертаємо без запису

            // Не знайшли — підвищуємо до write lock
            _rwLock.EnterWriteLock();
            try
            {
                // Перевіряємо ще раз (інший потік міг додати поки ми чекали)
                if (_cache.TryGetValue(key, out existing))
                    return existing;

                string newValue = factory(key);
                _cache[key] = newValue;
                return newValue;
            }
            finally
            {
                _rwLock.ExitWriteLock();
            }
        }
        finally
        {
            _rwLock.ExitUpgradeableReadLock();
        }
    }
}
```

:::info Upgradeable vs Read Lock
Одночасно може бути лише **один** `UpgradeableReadLock`, але поряд із ним можуть працювати звичайні читачі. Це запобігає deadlock: якщо два потоки одночасно спробують підвищитись до WriteLock, лише один отримає його.
:::

---

## Практичний приклад: кеш з ReaderWriterLockSlim

Реалістичний приклад — простий TTL-кеш (з терміном дії записів):

```csharp
using System;
using System.Collections.Generic;
using System.Threading;

public class TtlCache<TKey, TValue> : IDisposable
    where TKey : notnull
{
    private record CacheEntry(TValue Value, DateTime ExpiresAt);

    private readonly Dictionary<TKey, CacheEntry> _store = new();
    private readonly ReaderWriterLockSlim _lock = new ReaderWriterLockSlim();
    private readonly TimeSpan _defaultTtl;

    public TtlCache(TimeSpan defaultTtl)
    {
        _defaultTtl = defaultTtl;
    }

    public bool TryGet(TKey key, out TValue? value)
    {
        _lock.EnterReadLock();
        try
        {
            if (_store.TryGetValue(key, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
            {
                value = entry.Value;
                return true;
            }
            value = default;
            return false;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public void Set(TKey key, TValue value, TimeSpan? ttl = null)
    {
        var expiresAt = DateTime.UtcNow + (ttl ?? _defaultTtl);
        _lock.EnterWriteLock();
        try
        {
            _store[key] = new CacheEntry(value, expiresAt);
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public TValue GetOrCreate(TKey key, Func<TKey, TValue> factory, TimeSpan? ttl = null)
    {
        _lock.EnterUpgradeableReadLock();
        try
        {
            if (_store.TryGetValue(key, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
                return entry.Value;

            _lock.EnterWriteLock();
            try
            {
                // Double-check після отримання WriteLock
                if (_store.TryGetValue(key, out entry) && entry.ExpiresAt > DateTime.UtcNow)
                    return entry.Value;

                var value = factory(key);
                var expiresAt = DateTime.UtcNow + (ttl ?? _defaultTtl);
                _store[key] = new CacheEntry(value, expiresAt);
                return value;
            }
            finally
            {
                _lock.ExitWriteLock();
            }
        }
        finally
        {
            _lock.ExitUpgradeableReadLock();
        }
    }

    public void Cleanup()
    {
        var now = DateTime.UtcNow;
        _lock.EnterWriteLock();
        try
        {
            var expired = new List<TKey>();
            foreach (var kvp in _store)
                if (kvp.Value.ExpiresAt <= now)
                    expired.Add(kvp.Key);

            foreach (var key in expired)
                _store.Remove(key);
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void Dispose() => _lock.Dispose();
}

// Використання
class Program
{
    static void Main()
    {
        using var cache = new TtlCache<string, string>(TimeSpan.FromSeconds(30));

        // Багато читачів паралельно — це ефективно!
        Parallel.For(0, 20, i =>
        {
            var value = cache.GetOrCreate($"key_{i % 5}", k =>
            {
                Console.WriteLine($"  Обчислення для {k}...");
                Thread.Sleep(10);
                return $"value_{k}";
            });
            Console.WriteLine($"Потік {i}: {value}");
        });
    }
}
```

---

## Порівняльна таблиця примітивів синхронізації

| Примітив | Між процесами | Async підтримка | Кілька доступів | Швидкість | Коли використовувати |
|---|---|---|---|---|---|
| `lock` | Ні | Ні | Ні (1) | Найшвидший | Більшість випадків в одному процесі |
| `Mutex` | **Так** | Ні | Ні (1) | Повільний | Між-процесна синхронізація, один екземпляр програми |
| `Semaphore` | **Так** | Ні | **Так (N)** | Повільний | Між-процесне обмеження паралелізму |
| `SemaphoreSlim` | Ні | **Так** | **Так (N)** | Швидкий | Обмеження паралельних async-операцій, rate limiting |
| `ReaderWriterLockSlim` | Ні | Ні | **Так (читачі)** | Швидкий | Кеш, конфігурація: багато читань, рідкісний запис |
| `Monitor` | Ні | Ні | Ні (1) | Найшвидший | Producer-consumer, очікування з умовою |
