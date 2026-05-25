---
sidebar_position: 1
---

# Стан гонки та lock

## Що таке стан гонки (race condition)

Коли кілька потоків одночасно звертаються до спільних даних і **хоча б один із них виконує запис**, виникає ситуація, яку називають **станом гонки** (race condition). Результат програми стає непередбачуваним і залежить від того, який потік "прийде першим".

Уявіть двох касирів, що одночасно перевіряють залишок на одному рахунку та знімають гроші:

```
Рахунок: 100 грн

Потік A (касир 1)          Потік B (касир 2)
─────────────────────────────────────────────
читає: balance = 100
                           читає: balance = 100
обчислює: 100 - 80 = 20
                           обчислює: 100 - 90 = 10
записує: balance = 20
                           записує: balance = 10   ← перезаписує!

Результат: 10 грн (а не -70, хоча грошей не вистачало!)
```

Обидва касири прочитали одне й те ж значення до того, як хтось із них завершив запис.

---

## Проблема некоректного інкременту

Найпростіший приклад — кілька потоків одночасно збільшують лічильник:

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;

class RaceConditionDemo
{
    static int _counter = 0;

    static void Main()
    {
        // Запускаємо 5 потоків, кожен інкрементує _counter 100 000 разів
        var tasks = new Task[5];
        for (int i = 0; i < 5; i++)
        {
            tasks[i] = Task.Run(() =>
            {
                for (int j = 0; j < 100_000; j++)
                {
                    _counter++; // НЕ атомарна операція!
                }
            });
        }

        Task.WaitAll(tasks);

        // Очікуємо: 500 000
        // Реальний результат: ~350 000 — ~490 000 (кожен раз різний!)
        Console.WriteLine($"Результат: {_counter}");
    }
}
```

:::danger Чому `_counter++` небезпечний?
Оператор `++` — це **три окремі мікрооперації** на рівні процесора:
1. **Читання** значення з пам'яті в регістр
2. **Збільшення** значення в регістрі
3. **Запис** значення з регістра назад у пам'ять

Між будь-якими двома з цих кроків операційна система може перемкнути потік — і тоді один потік перезапише зміни іншого.
:::

---

## Ключове слово `lock`

`lock` — найпростіший і найпоширеніший спосіб синхронізації в C#. Він гарантує, що **лише один потік** одночасно виконує захищений блок коду.

### Синтаксис

```csharp
private readonly object _lock = new object();

// У методі:
lock (_lock)
{
    // Критична секція — лише один потік тут одночасно
    _counter++;
}
```

### Як це працює всередині

`lock` — це **синтаксичний цукор** над класом `Monitor`. Компілятор розгортає його приблизно так:

```csharp
// Те, що ви пишете:
lock (_lock)
{
    _counter++;
}

// Те, що компілятор генерує:
bool lockTaken = false;
try
{
    Monitor.Enter(_lock, ref lockTaken);
    _counter++;
}
finally
{
    if (lockTaken)
        Monitor.Exit(_lock);
}
```

`Monitor.Enter` захоплює **м'ютекс** (взаємне виключення) об'єкта. Якщо інший потік уже захопив цей м'ютекс — поточний потік **блокується** і чекає в черзі. Коли власник виходить із `lock`, один із потоків-очікувачів отримує доступ.

### Виправлений приклад з `lock`

```csharp
class SafeCounterDemo
{
    static int _counter = 0;
    static readonly object _lock = new object();

    static void Main()
    {
        var tasks = new Task[5];
        for (int i = 0; i < 5; i++)
        {
            tasks[i] = Task.Run(() =>
            {
                for (int j = 0; j < 100_000; j++)
                {
                    lock (_lock)
                    {
                        _counter++;
                    }
                }
            });
        }

        Task.WaitAll(tasks);
        Console.WriteLine($"Результат: {_counter}"); // Завжди: 500 000
    }
}
```

---

## Об'єкт блокування: правила вибору

Як об'єкт для `lock` слід завжди використовувати **приватне readonly поле**:

```csharp
public class BankAccount
{
    private readonly object _lock = new object(); // правильно

    private decimal _balance;

    public void Deposit(decimal amount)
    {
        lock (_lock)
        {
            _balance += amount;
        }
    }

    public void Withdraw(decimal amount)
    {
        lock (_lock)
        {
            if (_balance >= amount)
                _balance -= amount;
        }
    }
}
```

:::danger Що НЕ можна використовувати як об'єкт lock

**`lock(this)` — заборонено:**
```csharp
lock (this) { ... } // НЕБЕЗПЕЧНО!
```
Зовнішній код може теж виконати `lock(myObject)` і створити непередбачуваний deadlock.

**`lock("рядок")` — заборонено:**
```csharp
lock ("shared-resource") { ... } // НЕБЕЗПЕЧНО!
```
Рядкові літерали **інтернуються** в .NET — усі рядки з однаковим вмістом посилаються на **один і той самий** об'єкт у пам'яті. Це означає, що `lock("shared-resource")` у двох абсолютно різних класах заблокує **один і той самий** об'єкт, навіть якщо вони не пов'язані між собою.

**`lock(typeof(MyClass))` — заборонено:**
```csharp
lock (typeof(MyClass)) { ... } // НЕБЕЗПЕЧНО!
```
Об'єкти `Type` також є глобальними — один і той самий об'єкт доступний звідусіль. Це може призвести до блокування несвязаного коду.

**Правило:** об'єкт блокування повинен бути `private` (недоступний ззовні) і `readonly` (не може бути переприсвоєний).
:::

---

## Deadlock: взаємне блокування

**Deadlock** — ситуація, коли два або більше потоків **нескінченно чекають один одного**, і жоден не може продовжити виконання.

### Класична схема

```
Потік A                          Потік B
──────────────────────────────────────────────────
захоплює lockA ✓
                                 захоплює lockB ✓
чекає на lockB... ⏳
                                 чекає на lockA... ⏳
        ← обидва чекають вічно →
```

### Код, що демонструє deadlock

```csharp
class DeadlockDemo
{
    static readonly object _lockA = new object();
    static readonly object _lockB = new object();

    static void Main()
    {
        var t1 = new Thread(Thread1);
        var t2 = new Thread(Thread2);
        t1.Start();
        t2.Start();
        // Програма "зависне" — обидва потоки чекають нескінченно
    }

    static void Thread1()
    {
        lock (_lockA)                    // 1. захоплює A
        {
            Thread.Sleep(100);           // дає потоку 2 час захопити B
            lock (_lockB) { /* ... */ }  // 2. чекає на B — DEADLOCK!
        }
    }

    static void Thread2()
    {
        lock (_lockB)                    // 1. захоплює B
        {
            Thread.Sleep(100);           // дає потоку 1 час захопити A
            lock (_lockA) { /* ... */ }  // 2. чекає на A — DEADLOCK!
        }
    }
}
```

### Як уникнути deadlock

:::tip Правила запобігання deadlock
1. **Завжди захоплюйте lock-и в одному й тому ж порядку.** Якщо потік A і потік B завжди захоплюють `_lockA` перед `_lockB` — deadlock неможливий.
2. **Мінімізуйте час утримання lock.** Не викликайте зовнішні методи всередині `lock`.
3. **Використовуйте `Monitor.TryEnter` з таймаутом** — для випадків, коли не хочете блокуватись назавжди.
4. **Уникайте вкладених lock-ів** — якщо можна обійтись одним об'єктом блокування.
:::

```csharp
// Виправлений варіант — однаковий порядок захоплення в обох потоках
static void Thread1Fixed()
{
    lock (_lockA)       // спочатку A
    {
        lock (_lockB)   // потім B
        { /* ... */ }
    }
}

static void Thread2Fixed()
{
    lock (_lockA)       // спочатку A (той самий порядок!)
    {
        lock (_lockB)   // потім B
        { /* ... */ }
    }
}
```

---

## Клас Monitor: розширені можливості

`Monitor` надає більше можливостей, ніж просте ключове слово `lock`.

### `TryEnter` з таймаутом

```csharp
class MonitorTryEnterDemo
{
    private static readonly object _lock = new object();
    private static int _value = 0;

    public static bool TryUpdateValue(int newValue, int timeoutMs = 500)
    {
        bool lockTaken = false;
        try
        {
            // Намагаємось захопити lock не більше 500 мс
            Monitor.TryEnter(_lock, timeoutMs, ref lockTaken);

            if (!lockTaken)
            {
                Console.WriteLine("Не вдалось отримати lock — ресурс зайнятий");
                return false;
            }

            _value = newValue;
            return true;
        }
        finally
        {
            if (lockTaken)
                Monitor.Exit(_lock);
        }
    }
}
```

### `Monitor.Wait` та `Monitor.Pulse`: паттерн Producer-Consumer

`Monitor.Wait` тимчасово **звільняє** lock і переводить потік у стан очікування. `Monitor.Pulse` будить один із потоків, що очікують.

```csharp
class ProducerConsumerMonitor
{
    private static readonly Queue<int> _queue = new Queue<int>();
    private static readonly object _lock = new object();
    private static bool _finished = false;

    static void Main()
    {
        var producer = new Thread(Produce);
        var consumer = new Thread(Consume);
        producer.Start();
        consumer.Start();
        producer.Join();
        consumer.Join();
    }

    static void Produce()
    {
        for (int i = 1; i <= 5; i++)
        {
            lock (_lock)
            {
                _queue.Enqueue(i);
                Console.WriteLine($"Вироблено: {i}");
                Monitor.Pulse(_lock); // будимо споживача
            }
            Thread.Sleep(200);
        }

        lock (_lock)
        {
            _finished = true;
            Monitor.Pulse(_lock); // останній сигнал споживачу
        }
    }

    static void Consume()
    {
        while (true)
        {
            lock (_lock)
            {
                // Чекаємо, поки черга не стане непустою
                while (_queue.Count == 0 && !_finished)
                    Monitor.Wait(_lock); // звільняє lock і чекає

                if (_queue.Count == 0 && _finished)
                    break;

                int item = _queue.Dequeue();
                Console.WriteLine($"Спожито: {item}");
            }
        }
    }
}
```

:::info Monitor.Wait vs Thread.Sleep
`Monitor.Wait` **звільняє** захоплений lock на час очікування — інші потоки можуть зайти в критичну секцію. `Thread.Sleep` цього НЕ робить — lock утримується під час сну.
:::

---

## `volatile`: для простих прапорців

Коли один потік читає змінну, а інший — лише записує в неї, і складна синхронізація не потрібна, можна використати ключове слово `volatile`:

```csharp
class VolatileDemo
{
    // volatile гарантує, що читання/запис не кешуватиметься в регістрі
    private static volatile bool _shouldStop = false;

    static void Main()
    {
        var worker = new Thread(() =>
        {
            Console.WriteLine("Потік запущено");
            while (!_shouldStop) // завжди читає "свіже" значення з пам'яті
            {
                Thread.SpinWait(100);
            }
            Console.WriteLine("Потік зупинено");
        });

        worker.Start();
        Thread.Sleep(500);
        _shouldStop = true; // потік побачить цю зміну
        worker.Join();
    }
}
```

:::warning Обмеження `volatile`
`volatile` вирішує лише проблему **видимості** змін між потоками (compiler/CPU reordering). Він **не захищає** від race condition при складених операціях (читання + модифікація + запис). Для лічильників, що змінюються кількома потоками, використовуйте `Interlocked` або `lock`.
:::
