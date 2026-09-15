---
sidebar_position: 7
---

# Абстракція на практиці: проєктування за інтерфейсами

Синтаксис інтерфейсів ви вже бачили: слово `interface`, порожні методи,
двокрапка в оголошенні класу. Але доки інтерфейс — це просто «клас без тіла
методів», незрозуміло, навіщо він взагалі потрібен. Адже можна написати
методи одразу, без зайвого файлу.

Цей підрозділ відповідає саме на це питання. Ми візьмемо живу задачу —
**систему сповіщень** — і побачимо, як вона виглядає без інтерфейсів і як
змінюється з ними. Наприкінці буде видно головне: інтерфейс потрібен не
компілятору, а **людині, яка супроводжуватиме код через півроку**.

## Задача: система сповіщень

Інтернет-магазин має повідомляти клієнта про статус замовлення. Спочатку —
тільки електронною поштою. Найпростіше рішення виглядає так:

```csharp
class OrderService
{
    public void PlaceOrder(string customer, decimal amount)
    {
        Console.WriteLine($"Замовлення для {customer} на суму {amount} грн оформлено.");

        // сповіщення прямо тут
        var emailSender = new EmailSender();
        emailSender.SendEmail(customer, $"Ваше замовлення на {amount} грн прийнято.");
    }
}
```

Працює. Поки замовник не скаже: «додайте ще SMS». Ви дописуєте другий об'єкт
і другий виклик. Потім: «додайте Telegram». Третій. Потім: «для оптових
клієнтів тільки пошта, для роздрібних — SMS». І ось `OrderService`
перетворюється на ялинку з `if`-ів, хоча оформлення замовлення не змінилося
жодного разу.

Проблема називається **жорсткою залежністю** (tight coupling): клас
`OrderService` намертво прив'язаний до конкретного класу `EmailSender`.
Щоб змінити спосіб сповіщення, доводиться правити код, який до сповіщень
не має жодного стосунку.

## Крок 1. Виділяємо інтерфейс

Запитаємо себе: що спільного в пошти, SMS і Telegram? Усі вони вміють одне —
**доставити текст адресатові**. Деталі різні, суть однакова. Ця суть і є
**абстракція**, а записується вона інтерфейсом.

```csharp
interface INotifier
{
    // Назва каналу — для журналу та інтерфейсу користувача
    string ChannelName { get; }

    // Надіслати повідомлення отримувачу
    void Send(string recipient, string message);
}
```

Інтерфейс — це **контракт**: «хто б ти не був, якщо ти `INotifier`, ти вмієш
`Send`». Як саме вмієш — твоя особиста справа.

:::info[Цікаво]
Назви інтерфейсів у .NET традиційно починаються з великої `I`: `INotifier`,
`IComparable`, `IDisposable`. Це не вимога компілятора, а домовленість,
якій уже понад двадцять років. Завдяки їй, побачивши в коді `IPayment`,
ви одразу знаєте: це контракт, а не клас.
:::

## Крок 2. Реалізації

Тепер кожен канал — окремий маленький клас, який знає тільки про себе.

```csharp
class EmailNotifier : INotifier
{
    public string ChannelName => "Email";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[SMTP] Лист на адресу {recipient}");
        Console.WriteLine($"       Тема: Повідомлення від магазину");
        Console.WriteLine($"       Текст: {message}");
    }
}

class SmsNotifier : INotifier
{
    private const int MaxLength = 70;

    public string ChannelName => "SMS";

    public void Send(string recipient, string message)
    {
        // SMS має обмеження довжини — це деталь саме цього каналу
        string shortText = message.Length > MaxLength
            ? message.Substring(0, MaxLength - 3) + "..."
            : message;

        Console.WriteLine($"[GSM] SMS на номер {recipient}: {shortText}");
    }
}

class TelegramNotifier : INotifier
{
    public string ChannelName => "Telegram";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[BOT] Telegram для @{recipient}");
        Console.WriteLine($"      {message}");
    }
}
```

Зверніть увагу: `SmsNotifier` має власну константу `MaxLength`, про яку не
знає ні інтерфейс, ні інші класи. Кожна реалізація зберігає свої деталі
всередині — це і є **інкапсуляція на службі в абстракції**.

## Крок 3. Клас, який працює з абстракцією

Тепер найважливіше. `OrderService` більше не знає про пошту:

```csharp
class OrderService
{
    private readonly INotifier notifier;      // тип — ІНТЕРФЕЙС, не клас

    // Реалізацію передають ззовні, а не створюють усередині
    public OrderService(INotifier notifier)
    {
        this.notifier = notifier;
    }

    public void PlaceOrder(string customer, string contact, decimal amount)
    {
        Console.WriteLine($"Замовлення для {customer} на {amount} грн оформлено.");
        notifier.Send(contact, $"Ваше замовлення на {amount} грн прийнято.");
    }
}
```

Поле оголошене як `INotifier`. `OrderService` не має жодного уявлення, що
всередині — пошта, SMS чи щось інше. Він знає тільки: «у мене є хтось, хто
вміє `Send`».

## Крок 4. Додаємо новий канал — без правок наявного коду

Замовник просить додати push-сповіщення в мобільний застосунок. Дивіться,
скільки рядків доведеться змінити в `OrderService`, `EmailNotifier`,
`SmsNotifier` і `TelegramNotifier`:

```csharp
class PushNotifier : INotifier
{
    public string ChannelName => "Push";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[FCM] Push на пристрій {recipient}: {message}");
    }
}
```

Нуль рядків. Ми **дописали** новий клас, не **переписавши** жодного старого.
Це і є принцип **відкритості та закритості** (Open/Closed) з SOLID, про
який ішлося в попередньому підрозділі: система відкрита для розширення і
закрита для змін.

```
        ┌──────────────────────┐
        │    OrderService      │   знає ТІЛЬКИ про інтерфейс
        └──────────┬───────────┘
                   │ використовує
                   ▼
        ┌──────────────────────┐
        │     INotifier        │   контракт: Send(recipient, message)
        └──────────┬───────────┘
                   │ реалізують
   ┌───────────┬───┴────┬────────────┬─────────────┐
   ▼           ▼        ▼            ▼             ▼
 Email        Sms    Telegram      Push       ...нові канали
Notifier   Notifier  Notifier    Notifier      завтра
```

Стрілки йдуть **знизу вгору, до абстракції**. Ані `OrderService`, ані
конкретні класи не залежать один від одного — усі залежать від інтерфейсу
посередині.

## Ін'єкція залежності «на пальцях»

**Залежність** — це будь-який об'єкт, без якого клас не може працювати.
`OrderService` залежить від сповіщувача.

Є два способи цю залежність отримати.

**Спосіб перший — створити всередині:**

```csharp
class OrderService
{
    private readonly EmailNotifier notifier = new EmailNotifier();  // «зашито»
}
```

**Спосіб другий — прийняти ззовні, через конструктор:**

```csharp
class OrderService
{
    private readonly INotifier notifier;

    public OrderService(INotifier notifier)     // залежність «вкидають» ззовні
    {
        this.notifier = notifier;
    }
}
```

Другий спосіб називається **ін'єкцією залежності** (dependency injection, DI).
Назва солідна, ідея — дитяча: **не створюй сам, попроси, щоб дали**.

Аналогія: кавоварка не вирощує каву. Вона приймає капсулу, яку в неї вставили.
Тому одна кавоварка варить і арабіку, і робусту, і какао — а якби вона
вирощувала каву сама, змінити напій було б неможливо.

### Чому це робить код тестованим

Уявіть, що треба перевірити: чи справді `PlaceOrder` надсилає сповіщення?
З першим варіантом це означає реально відправити лист — потрібен SMTP-сервер,
інтернет і чиясь поштова скринька. Автоматичний тест так писати неможливо.

З ін'єкцією ми підставляємо **підробку** (в тестуванні її називають
**mock** або **заглушка**):

```csharp
class FakeNotifier : INotifier
{
    public string ChannelName => "Fake";

    public List<string> SentMessages { get; } = new List<string>();

    public void Send(string recipient, string message)
    {
        SentMessages.Add($"{recipient}: {message}");   // нікуди не шлемо, лише записуємо
    }
}
```

Тепер перевірка не потребує ні мережі, ні пошти:

```csharp
var fake = new FakeNotifier();
var service = new OrderService(fake);

service.PlaceOrder("Іван", "ivan@example.com", 450m);

Console.WriteLine($"Надіслано повідомлень: {fake.SentMessages.Count}");
Console.WriteLine($"Текст: {fake.SentMessages[0]}");
```

**Вивід:**

```
Замовлення для Іван на 450 грн оформлено.
Надіслано повідомлень: 1
Текст: ivan@example.com: Ваше замовлення на 450 грн прийнято.
```

:::tip[Порада]
Ознака жорсткої залежності — слово `new` усередині класу для об'єктів, які
щось роблять «назовні»: працюють з базою, мережею, файлами, часом. Прості
об'єкти-дані (`new List`, `new StringBuilder`) створювати всередині цілком
нормально. Питайте себе: «чи захочу я колись підмінити це в тесті?»
:::

:::info[Цікаво]
У великих проєктах на ASP.NET Core ін'єкція залежностей вбудована в сам
фреймворк: ви один раз описуєте в налаштуваннях, який клас відповідає якому
інтерфейсу, а далі фреймворк сам створює й передає об'єкти в конструктори.
Механізм, який ми щойно зробили руками, там працює автоматично.
:::

## Програмування «до інтерфейсу, а не до реалізації»

Правило стосується не лише власних інтерфейсів. Воно стосується й параметрів
методів.

**Як часто пишуть початківці:**

```csharp
static decimal CalculateTotal(List<decimal> prices)
{
    decimal sum = 0;
    foreach (decimal p in prices) sum += p;
    return sum;
}
```

Метод лише перебирає елементи, але вимагає саме `List`. Це означає, що
передати йому масив, `HashSet` чи результат LINQ-запиту неможливо — доведеться
щоразу писати `.ToList()` і створювати зайву копію в пам'яті.

**Як краще:**

```csharp
static decimal CalculateTotal(IEnumerable<decimal> prices)
{
    decimal sum = 0;
    foreach (decimal p in prices) sum += p;
    return sum;
}
```

`IEnumerable` — це найслабша вимога з можливих: «дай мені щось, що можна
перебрати `foreach`». Тепер метод приймає все:

```csharp
decimal[] array = [120m, 45m, 380m];
List<decimal> list = [99m, 250m];
var filtered = array.Where(p => p > 100m);

Console.WriteLine(CalculateTotal(array));      // масив
Console.WriteLine(CalculateTotal(list));       // список
Console.WriteLine(CalculateTotal(filtered));   // результат LINQ
```

**Вивід:**

```
545
349
500
```

Правило формулюється так: **вимагай мінімум, обіцяй максимум**. У параметрах
беріть найзагальніший тип, якого вистачає для роботи.

| Що робить метод з колекцією | Який тип параметра брати |
|---|---|
| Тільки перебирає `foreach` | `IEnumerable<T>` |
| Потребує кількість і доступ за індексом | `IReadOnlyList<T>` |
| Додає або видаляє елементи | `ICollection<T>` або `List<T>` |
| Шукає за ключем | `IDictionary<TKey, TValue>` |

:::warning[Обережно]
З типом **повернення** правило зворотне. Якщо метод повертає `IEnumerable`,
отриманий від LINQ, колекція може обчислюватися **відкладено** — і кожен
повторний перебір запускатиме обчислення заново. Коли результат уже готовий
і повний, повертайте конкретний `List` або масив, або завершуйте запит
викликом `.ToList()`.
:::

## Явна реалізація інтерфейсу

Іноді клас реалізує два інтерфейси, у яких випадково збігається назва методу,
а сенс різний. Приклад із життя: у нашій системі є інтерфейс сповіщень і
інтерфейс журналювання, і обидва мають метод `Send`.

```csharp
interface IMessageChannel
{
    void Send(string text);      // надіслати клієнту
}

interface IAuditLog
{
    void Send(string text);      // записати в журнал аудиту
}
```

Якщо написати один публічний `Send`, він стане реалізацією обох — а це
неправильно, бо дії різні. Вихід — **явна реалізація інтерфейсу**: метод
оголошується з іменем інтерфейсу перед крапкою і **без модифікатора доступу**.

```csharp
class NotificationGateway : IMessageChannel, IAuditLog
{
    void IMessageChannel.Send(string text)
    {
        Console.WriteLine($"[КЛІЄНТУ] {text}");
    }

    void IAuditLog.Send(string text)
    {
        Console.WriteLine($"[АУДИТ {DateTime.Now:HH:mm}] {text}");
    }
}
```

Викликати такий метод можна **тільки через змінну відповідного інтерфейсу**:

```csharp
var gateway = new NotificationGateway();

// gateway.Send("текст");            // помилка компіляції: такого методу немає

IMessageChannel channel = gateway;
channel.Send("Ваше замовлення відправлено");

IAuditLog audit = gateway;
audit.Send("Замовлення 1042 відправлено оператором admin");
```

**Вивід:**

```
[КЛІЄНТУ] Ваше замовлення відправлено
[АУДИТ 14:35] Замовлення 1042 відправлено оператором admin
```

Друга причина застосовувати явну реалізацію — **прибрати метод з видимого
списку**. Наприклад, клас реалізує `IDisposable`, але ви не хочете, щоб
студенти випадково викликали `Dispose` вручну: явна реалізація сховає його
з автодоповнення, доки об'єкт не приведуть до `IDisposable`.

| Реалізація | Як оголошується | Де видно метод |
|---|---|---|
| Звичайна (неявна) | `public void Send(...)` | і в класі, і в інтерфейсі |
| Явна | `void IFoo.Send(...)` | тільки через змінну типу `IFoo` |

:::warning[Обережно]
Явна реалізація — інструмент для рідкісних випадків: конфлікт імен або
свідоме приховування методу. Не робіть явними всі методи «для краси» —
код стане незручним, бо кожен виклик вимагатиме приведення типу.
:::

## Методи за замовчуванням в інтерфейсах

Починаючи з C# 8, інтерфейс може містити **реалізацію** методу. Такий метод
називають **методом за замовчуванням** (default interface method): якщо клас
його не перевизначив, працює версія з інтерфейсу.

```csharp
interface INotifier
{
    string ChannelName { get; }

    void Send(string recipient, string message);

    // метод із тілом прямо в інтерфейсі
    void SendUrgent(string recipient, string message)
    {
        Send(recipient, "ТЕРМІНОВО! " + message);
    }
}
```

Тепер усі наявні класи автоматично отримали `SendUrgent`, і жоден із них не
довелося правити:

```csharp
INotifier sms = new SmsNotifier();
sms.SendUrgent("+380501234567", "Кур'єр біля під'їзду, вийдіть протягом 5 хвилин");
```

**Вивід:**

```
[GSM] SMS на номер +380501234567: ТЕРМІНОВО! Кур'єр біля під'їзду, вийд...
```

Клас за бажанням може дати власну версію:

```csharp
class TelegramNotifier : INotifier
{
    public string ChannelName => "Telegram";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[BOT] Telegram для @{recipient}: {message}");
    }

    public void SendUrgent(string recipient, string message)
    {
        Console.WriteLine($"[BOT] Telegram для @{recipient} (закріплено вгорі чату)");
        Console.WriteLine($"      {message}");
    }
}
```

:::warning[Обережно]
Методи за замовчуванням створювалися для однієї конкретної задачі: **додати
метод до інтерфейсу, який уже використовують сотні чужих класів**, не
зламавши їх. Це задача авторів бібліотек, а не навчального проєкту.

У власному коді не перетворюйте інтерфейс на «майже клас». Ознаки зловживання:
у методі за замовчуванням з'являється складна логіка, хочеться додати поле
(в інтерфейсі полів немає), потрібен стан. Щойно так сталося — вам потрібен
**абстрактний клас**, а не інтерфейс.
:::

## Повний код прикладу

```csharp
using System;
using System.Collections.Generic;

// ---------- Абстракція ----------
interface INotifier
{
    string ChannelName { get; }
    void Send(string recipient, string message);

    void SendUrgent(string recipient, string message)
    {
        Send(recipient, "ТЕРМІНОВО! " + message);
    }
}

// ---------- Реалізації ----------
class EmailNotifier : INotifier
{
    public string ChannelName => "Email";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[SMTP] Лист на {recipient}: {message}");
    }
}

class SmsNotifier : INotifier
{
    private const int MaxLength = 70;

    public string ChannelName => "SMS";

    public void Send(string recipient, string message)
    {
        string shortText = message.Length > MaxLength
            ? message.Substring(0, MaxLength - 3) + "..."
            : message;
        Console.WriteLine($"[GSM] SMS на {recipient}: {shortText}");
    }
}

class TelegramNotifier : INotifier
{
    public string ChannelName => "Telegram";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[BOT] Telegram @{recipient}: {message}");
    }
}

// новий канал, доданий пізніше — наявний код не змінювався
class PushNotifier : INotifier
{
    public string ChannelName => "Push";

    public void Send(string recipient, string message)
    {
        Console.WriteLine($"[FCM] Push на пристрій {recipient}: {message}");
    }
}

// ---------- Клас, що залежить лише від абстракції ----------
class OrderService
{
    private readonly INotifier notifier;

    public OrderService(INotifier notifier)
    {
        this.notifier = notifier;
    }

    public void PlaceOrder(string customer, string contact, decimal amount)
    {
        Console.WriteLine($"Замовлення для {customer} на {amount} грн оформлено.");
        notifier.Send(contact, $"Ваше замовлення на {amount} грн прийнято.");
        Console.WriteLine($"(канал: {notifier.ChannelName})");
        Console.WriteLine();
    }
}

class Program
{
    static void Main()
    {
        // одна й та сама послуга з різними каналами
        var byEmail = new OrderService(new EmailNotifier());
        byEmail.PlaceOrder("Іван Коваль", "ivan@example.com", 450m);

        var bySms = new OrderService(new SmsNotifier());
        bySms.PlaceOrder("Олена Гриценко", "+380501234567", 1280m);

        var byPush = new OrderService(new PushNotifier());
        byPush.PlaceOrder("Андрій Шевчук", "device-A71F", 320m);

        // масовий розсилач: працюємо зі списком абстракцій
        Console.WriteLine("--- Масова розсилка ---");
        List<INotifier> allChannels =
        [
            new EmailNotifier(),
            new SmsNotifier(),
            new TelegramNotifier(),
            new PushNotifier()
        ];

        foreach (INotifier channel in allChannels)
        {
            channel.Send("test-user", "Планова перерва в роботі сайту з 02:00 до 03:00.");
        }

        Console.WriteLine();
        Console.WriteLine("--- Термінове повідомлення ---");
        allChannels[1].SendUrgent("+380501234567",
            "Кур'єр біля під'їзду, вийдіть протягом 5 хвилин, будь ласка");
    }
}
```

**Вивід:**

```
Замовлення для Іван Коваль на 450 грн оформлено.
[SMTP] Лист на ivan@example.com: Ваше замовлення на 450 грн прийнято.
(канал: Email)

Замовлення для Олена Гриценко на 1280 грн оформлено.
[GSM] SMS на +380501234567: Ваше замовлення на 1280 грн прийнято.
(канал: SMS)

Замовлення для Андрій Шевчук на 320 грн оформлено.
[FCM] Push на пристрій device-A71F: Ваше замовлення на 320 грн прийнято.
(канал: Push)

--- Масова розсилка ---
[SMTP] Лист на test-user: Планова перерва в роботі сайту з 02:00 до 03:00.
[GSM] SMS на test-user: Планова перерва в роботі сайту з 02:00 до 03:00.
[BOT] Telegram @test-user: Планова перерва в роботі сайту з 02:00 до 03:00.
[FCM] Push на пристрій test-user: Планова перерва в роботі сайту з 02:00 до 03:00.

--- Термінове повідомлення ---
[GSM] SMS на +380501234567: ТЕРМІНОВО! Кур'єр біля під'їзду, вийдіть прот...
```

Зверніть увагу на цикл `foreach`: змінна має тип `INotifier`, а виклик
`channel.Send(...)` щоразу потрапляє в інший клас. Це той самий **поліморфізм**
із теми 16, тільки роль базового типу грає не клас, а інтерфейс.

## Типові помилки

- **`new` конкретного класу всередині того, хто ним користується.**
  `private EmailNotifier n = new EmailNotifier();` робить клас неможливим
  для тестування й змін. Оголошуйте поле типом інтерфейсу і приймайте
  реалізацію через конструктор.
- **Тип поля — клас, а не інтерфейс.** Якщо написати
  `private EmailNotifier notifier;`, то навіть із ін'єкцією ви прив'язані
  до пошти. Абстракцію треба тримати в **типі змінної**, а не лише в тому,
  що передали.
- **`List` у параметрах методу, який лише перебирає елементи.**
  Беріть `IEnumerable<T>` — метод стане придатним для масивів і LINQ без
  зайвих копій.
- **Інтерфейс із єдиною реалізацією «на майбутнє».** Якщо реалізація одна
  і другої не передбачається, інтерфейс лише додає файл і плутанину.
  Виділяйте абстракцію тоді, коли реалізацій справді кілька або коли
  потрібна підміна в тестах.
- **Явна реалізація «щоб було красивіше».** Вона потрібна при конфлікті імен
  або для свідомого приховування методу. В усіх інших випадках звичайний
  `public` зрозуміліший.
