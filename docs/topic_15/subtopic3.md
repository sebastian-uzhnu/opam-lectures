---
sidebar_position: 4
---

# Практичний приклад: клас від початку до кінця

Ми розібрали поля, властивості, конструктори, статичні члени й модифікатори
доступу — кожен інструмент окремо. Тепер зберемо все в один наскрізний приклад
і пройдемо шлях, який проходить програміст щоразу, коли проєктує клас.

Задача: **клас банківського рахунку** для навчальної програми. Рахунок можна
поповнювати, знімати з нього гроші, дивитися баланс та історію операцій. Банк
має знати, скільки всього рахунків відкрито.

## Крок 1. Що взагалі має бути в класі

Перш ніж писати код, треба відповісти на три питання. Це найважливіший крок,
і саме його зазвичай пропускають.

**Які дані описують рахунок?**

- номер рахунку;
- ім'я власника;
- баланс;
- дата відкриття;
- історія операцій.

**Що з цього змінюється, а що ні?**

| Дані | Змінюється? | Висновок |
|---|---|---|
| Номер рахунку | ні, задається один раз | властивість тільки для читання |
| Ім'я власника | так, людина може змінити прізвище | властивість з валідацією |
| Баланс | так, але **тільки** через операції | `get` публічний, `set` приватний |
| Дата відкриття | ні | властивість тільки для читання |
| Історія | доповнюється, але ззовні не переписується | приватний список |

**Що рахунок уміє робити?**

- поповнитися на суму;
- видати суму, якщо коштів вистачає;
- показати історію;
- представити себе рядком.

Оці три таблички в голові — і половина класу вже спроєктована.

## Крок 2. Поля і властивості

```csharp
class BankAccount
{
    // ---------- Константи ----------
    public const decimal MinDeposit = 10m;
    public const decimal MaxWithdrawal = 20000m;

    // ---------- Статичні члени ----------
    private static int accountsCreated = 0;

    // ---------- Поля ----------
    private string ownerName = "";
    private readonly List<string> history = [];

    // ---------- Властивості ----------
    public string Number { get; }
    public DateTime OpenedAt { get; }
    public decimal Balance { get; private set; }

    public string OwnerName
    {
        get => ownerName;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Ім'я власника не може бути порожнім.");
            }
            ownerName = value.Trim();
        }
    }

    public int OperationsCount => history.Count;

    public static int AccountsCreated => accountsCreated;
}
```

Прокоментуємо рішення:

- `Number` і `OpenedAt` мають лише `get` — після створення їх не змінити навіть
  зсередини класу.
- `Balance` має `private set`: читати може будь-хто, писати — тільки методи
  самого класу.
- `ownerName` — поле-бекінг, бо у властивості `OwnerName` є валідація.
- `history` — приватний список, позначений `readonly`: саме посилання
  на список не зміниться ніколи, хоч уміст і доповнюватиметься.
- `OperationsCount` — обчислювана властивість. Немає що синхронізувати.
- `MinDeposit` записано як `10m` — суфікс `m` означає тип `decimal`.
  Для грошей завжди беріть `decimal`, а не `double`: `double` дає похибки
  округлення, і в фінансових розрахунках це неприпустимо.

:::warning[Обережно]
Приватний список, який ви повертаєте назовні через властивість, перестає
бути приватним: зовнішній код зможе викликати `Add` і `Clear` на ньому.
Нижче ми повертатимемо історію як `IReadOnlyList` — це те саме, але
без методів зміни.
:::

## Крок 3. Конструктори

```csharp
    // ---------- Конструктори ----------
    public BankAccount(string owner, decimal initialBalance)
    {
        if (initialBalance < 0)
        {
            throw new ArgumentException("Початковий баланс не може бути від'ємним.");
        }

        OwnerName = owner;              // валідація спрацює у властивості
        Balance = initialBalance;
        OpenedAt = DateTime.Now;

        accountsCreated++;
        Number = $"UA{accountsCreated:D8}";

        AddHistory($"Рахунок відкрито. Початковий баланс: {initialBalance:C}");
    }

    public BankAccount(string owner) : this(owner, 0)
    {
    }
```

Що тут важливого:

- головний конструктор один, другий делегує йому через `: this(owner, 0)`;
- `OwnerName = owner` — присвоєння **через властивість**, а не в поле.
  Так валідація не дублюється;
- номер рахунку генерується зі статичного лічильника, тому кожен рахунок
  отримує унікальний номер;
- `{initialBalance:C}` — формат «валюта», підставляє символ грошової одиниці
  з налаштувань системи.

## Крок 4. Методи

```csharp
    // ---------- Методи ----------
    public void Deposit(decimal amount)
    {
        if (amount < MinDeposit)
        {
            throw new ArgumentException($"Мінімальна сума поповнення — {MinDeposit:C}.");
        }

        Balance += amount;
        AddHistory($"Поповнення: +{amount:C}. Баланс: {Balance:C}");
    }

    public bool Withdraw(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentException("Сума зняття має бути додатною.");
        }

        if (amount > MaxWithdrawal)
        {
            AddHistory($"ВІДМОВА: спроба зняти {amount:C} — понад ліміт");
            return false;
        }

        if (amount > Balance)
        {
            AddHistory($"ВІДМОВА: спроба зняти {amount:C} — недостатньо коштів");
            return false;
        }

        Balance -= amount;
        AddHistory($"Зняття: -{amount:C}. Баланс: {Balance:C}");
        return true;
    }

    public IReadOnlyList<string> GetHistory() => history;

    private void AddHistory(string record)
    {
        history.Add($"[{DateTime.Now:HH:mm:ss}] {record}");
    }

    public override string ToString()
    {
        return $"{Number} | {OwnerName,-20} | {Balance,12:C}";
    }
}
```

Три деталі, які варто пояснити.

**Чому `Deposit` кидає виняток, а `Withdraw` повертає `false`?** Бо це різні
ситуації. Поповнення на 5 гривень — це помилка **того, хто викликав**: він
порушив правило, про яке мав знати. А спроба зняти більше, ніж є на рахунку, —
нормальна життєва ситуація, з якою програма має вміти працювати без падіння.
Виняток — для несподіванок, значення, що повертається, — для очікуваних відмов.

**`AddHistory` — приватний.** Це внутрішня механіка. Якби він був публічним,
будь-хто міг би дописати у виписку фальшивий запис.

**`ToString()` з ключовим словом `override`.** Кожен клас у .NET успадковує
метод `ToString()` від базового типу `object`. Стандартна версія повертає
назву типу, тому `Console.WriteLine(account)` без перевизначення вивів би
просто `BankAccount`. Слово `override` означає «замінюю успадковану поведінку
своєю» — детально це буде в темі 17. Записи `{OwnerName,-20}` і `{Balance,12:C}`
задають вирівнювання: `-20` — по лівому краю у 20 символів, `12` — по правому.

## Крок 5. Повний код класу

Зберемо все в один файл `BankAccount.cs`:

```csharp
class BankAccount
{
    public const decimal MinDeposit = 10m;
    public const decimal MaxWithdrawal = 20000m;

    private static int accountsCreated = 0;

    private string ownerName = "";
    private readonly List<string> history = [];

    public string Number { get; }
    public DateTime OpenedAt { get; }
    public decimal Balance { get; private set; }

    public string OwnerName
    {
        get => ownerName;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Ім'я власника не може бути порожнім.");
            }
            ownerName = value.Trim();
        }
    }

    public int OperationsCount => history.Count;
    public static int AccountsCreated => accountsCreated;

    public BankAccount(string owner, decimal initialBalance)
    {
        if (initialBalance < 0)
        {
            throw new ArgumentException("Початковий баланс не може бути від'ємним.");
        }

        OwnerName = owner;
        Balance = initialBalance;
        OpenedAt = DateTime.Now;

        accountsCreated++;
        Number = $"UA{accountsCreated:D8}";

        AddHistory($"Рахунок відкрито. Початковий баланс: {initialBalance:C}");
    }

    public BankAccount(string owner) : this(owner, 0)
    {
    }

    public void Deposit(decimal amount)
    {
        if (amount < MinDeposit)
        {
            throw new ArgumentException($"Мінімальна сума поповнення — {MinDeposit:C}.");
        }

        Balance += amount;
        AddHistory($"Поповнення: +{amount:C}. Баланс: {Balance:C}");
    }

    public bool Withdraw(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentException("Сума зняття має бути додатною.");
        }

        if (amount > MaxWithdrawal)
        {
            AddHistory($"ВІДМОВА: спроба зняти {amount:C} — понад ліміт");
            return false;
        }

        if (amount > Balance)
        {
            AddHistory($"ВІДМОВА: спроба зняти {amount:C} — недостатньо коштів");
            return false;
        }

        Balance -= amount;
        AddHistory($"Зняття: -{amount:C}. Баланс: {Balance:C}");
        return true;
    }

    public IReadOnlyList<string> GetHistory() => history;

    private void AddHistory(string record)
    {
        history.Add($"[{DateTime.Now:HH:mm:ss}] {record}");
    }

    public override string ToString()
    {
        return $"{Number} | {OwnerName,-20} | {Balance,12:C}";
    }
}
```

## Крок 6. Програма, яка цим користується

Файл `Program.cs`:

```csharp
using System.Globalization;

// щоб суми виводилися у гривнях незалежно від налаштувань комп'ютера
CultureInfo.CurrentCulture = new CultureInfo("uk-UA");

Console.WriteLine("=== ВІДКРИТТЯ РАХУНКІВ ===\n");

var olena = new BankAccount("Олена Кравчук", 5000);
var ihor = new BankAccount("Ігор Мельник");

Console.WriteLine(olena);
Console.WriteLine(ihor);
Console.WriteLine($"\nУсього відкрито рахунків: {BankAccount.AccountsCreated}\n");

Console.WriteLine("=== ОПЕРАЦІЇ ===\n");

olena.Deposit(1500);
olena.Withdraw(2000);

if (!olena.Withdraw(100000))
{
    Console.WriteLine("Операцію на 100 000 відхилено.");
}

ihor.Deposit(300);

if (!ihor.Withdraw(500))
{
    Console.WriteLine("Операцію Ігоря на 500 відхилено: недостатньо коштів.");
}

Console.WriteLine("\n=== СПРОБИ ЗЛАМАТИ ОБ'ЄКТ ===\n");

try
{
    olena.Deposit(3);
}
catch (ArgumentException ex)
{
    Console.WriteLine($"Помилка: {ex.Message}");
}

try
{
    ihor.OwnerName = "   ";
}
catch (ArgumentException ex)
{
    Console.WriteLine($"Помилка: {ex.Message}");
}

// olena.Balance = 1000000;   // не скомпілюється: set приватний

Console.WriteLine("\n=== ПІДСУМОК ===\n");

var accounts = new List<BankAccount> { olena, ihor };
foreach (var account in accounts)
{
    Console.WriteLine(account);
}

Console.WriteLine($"\nВиписка по рахунку {olena.Number} " +
                  $"({olena.OperationsCount} операцій):");

foreach (string record in olena.GetHistory())
{
    Console.WriteLine("  " + record);
}
```

**Вивід:**

```
=== ВІДКРИТТЯ РАХУНКІВ ===

UA00000001 | Олена Кравчук        |  5 000,00 ₴
UA00000002 | Ігор Мельник         |      0,00 ₴

Усього відкрито рахунків: 2

=== ОПЕРАЦІЇ ===

Операцію на 100 000 відхилено.
Операцію Ігоря на 500 відхилено: недостатньо коштів.

=== СПРОБИ ЗЛАМАТИ ОБ'ЄКТ ===

Помилка: Мінімальна сума поповнення — 10,00 ₴.
Помилка: Ім'я власника не може бути порожнім.

=== ПІДСУМОК ===

UA00000001 | Олена Кравчук        |  4 500,00 ₴
UA00000002 | Ігор Мельник         |    300,00 ₴

Виписка по рахунку UA00000001 (4 операції):
  [14:22:07] Рахунок відкрито. Початковий баланс: 5 000,00 ₴
  [14:22:07] Поповнення: +1 500,00 ₴. Баланс: 6 500,00 ₴
  [14:22:07] Зняття: -2 000,00 ₴. Баланс: 4 500,00 ₴
  [14:22:07] ВІДМОВА: спроба зняти 100 000,00 ₴ — понад ліміт
```

:::note
Зверніть увагу: спроба поповнити рахунок на 3 гривні у виписці **не з'явилася**.
Метод `Deposit` кидає виняток ще до того, як дійде до запису в історію, —
тож жодного сліду невдалої операції не лишається. А от відмову у знятті
ми свідомо записуємо: банкові корисно бачити, що клієнт намагався зняти
понад ліміт. Що саме потрапляє в історію — рішення проєктувальника класу,
і його варто ухвалювати свідомо.
:::

## Що ми отримали

Порівняйте цей клас із версією «просто три публічні поля» з теми 14:

| Що можна зробити ззовні | Публічні поля | Наш клас |
|---|---|---|
| Записати від'ємний баланс | так | ні, немає публічного `set` |
| Створити рахунок без власника | так | ні, конструктор вимагає ім'я |
| Записати порожнє ім'я | так | ні, валідація у властивості |
| Зняти більше, ніж є | так | ні, перевірка у `Withdraw` |
| Підробити історію операцій | так | ні, `AddHistory` приватний |
| Дізнатися кількість рахунків | ні, нема де зберігати | так, статична властивість |

Об'єкт став **самодостатнім**: щоб користуватися ним правильно, не треба
пам'ятати жодного зовнішнього правила. Усі правила всередині.

:::tip[Порада]
Корисна вправа після написання будь-якого класу: спробуйте його **зламати**.
Напишіть десяток рядків, які намагаються привести об'єкт у неможливий стан.
Кожен рядок, який спрацював, — це діра в інкапсуляції. Кожен, що не
скомпілювався або кинув виняток, — правильно зроблена робота.
:::

## Типові помилки

**Публічні поля замість властивостей.**

```csharp
// погано
public decimal Balance;

// добре
public decimal Balance { get; private set; }
```
Публічне поле неможливо ані перевірити, ані згодом замінити на обчислюване,
не зламавши весь код, що ним користується.

**Конструктор, який нічого не перевіряє.**

```csharp
// погано: об'єкт народжується зіпсованим
public BankAccount(string owner, decimal balance)
{
    OwnerName = owner;       // а якщо null?
    Balance = balance;       // а якщо -5000?
}
```
Конструктор — остання лінія оборони. Якщо він пропустив некоректні дані,
далі їх уже ніхто не зупинить.

**Властивість із порожнім `set`.**

```csharp
// погано: присвоєння мовчки зникає
public decimal Balance
{
    get => balance;
    set { }
}
```
Зовнішній код напише `account.Balance = 100`, нічого не станеться, і ніхто
не дізнається. Якщо змінювати не можна — не пишіть `set` узагалі.

**Плутанина `static` і членів екземпляра.**

```csharp
// погано: баланс став спільним для ВСІХ рахунків
private static decimal balance;
```
Один `static` не в тому місці — і поповнення Олениного рахунку збільшує
баланс Ігоря. Правило: `static` — для того, що стосується класу в цілому
(лічильник, константи, утиліти), решта — членів екземпляра.

**Валідація продубльована в конструкторі й у властивості.** Якщо перевірка
вже є у `set`, конструктор має присвоювати **через властивість**
(`OwnerName = owner`), а не в поле-бекінг (`ownerName = owner`). Інакше
конструктор обійде власну ж перевірку.
