---
sidebar_position: 4
---

# Практичний приклад: система класів компанії

Ми розібрали наслідування, перевизначення й поліморфізм окремо. Тепер зберемо
все разом на одній задачі — саме такій, які трапляються в реальних проєктах
і на лабораторних роботах.

## Постановка задачі

Невелика компанія хоче автоматизувати нарахування зарплати. У штаті є різні
категорії співробітників, і платять їм за різними правилами:

- **погодинні працівники** — за фактично відпрацьовані години, понад
  160 годин на місяць діє півторний тариф;
- **штатні співробітники** — фіксований місячний оклад плюс премія у відсотках;
- **менеджери** — це штатні співробітники, які додатково отримують надбавку
  за керівництво командою: 5 % окладу за кожного підлеглого, але не більше
  50 % загалом.

Програма має друкувати загальну відомість по всіх співробітниках, деталізацію
нарахувань і підсумкову статистику. Найголовніша вимога: **додавання нової
категорії співробітників не повинно вимагати правок у коді відомості**.

## Крок 1. Проєктуємо ієрархію

Перше, що робить розробник, — шукає **спільне** й **відмінне**.

| Що | Спільне для всіх | Відрізняється |
|---|---|---|
| Табельний номер | так | ні |
| ПІБ | так | ні |
| Дата прийняття | так | ні |
| Назва посади | ні | у кожного своя |
| Спосіб нарахування | ні | у кожного свій |

Спільне йде в базовий клас, відмінне стає віртуальними членами.

Тепер перевірмо речення «є» для кожного кандидата в нащадки:

- «Погодинний працівник **є** співробітником» — так;
- «Штатний співробітник **є** співробітником» — так;
- «Менеджер **є** штатним співробітником» — так, він теж має оклад і премію,
  просто ще й надбавку за команду.

Останній пункт важливий: менеджер логічно вбудовується не в корінь ієрархії,
а на рівень нижче. Отримуємо три поверхи:

```
                       object
                          │
                       Employee
             (Id, FullName, HireDate,
              Position, CalculateSalary)
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    HourlyEmployee              SalariedEmployee
   (HourlyRate, Hours)        (MonthlySalary, Bonus)
                                        │
                                        ▼
                                     Manager
                              (список підлеглих)
```

А от «менеджер **має** підлеглих» — це вже не наслідування, а композиція:
всередині менеджера буде поле `List<Employee>`.

:::note
Зверніть увагу на елегантність: список підлеглих має тип `List<Employee>`,
тобто **базового** типу. Тому менеджер може керувати ким завгодно —
погодинними працівниками, штатними, навіть іншими менеджерами. І це працює
без жодного рядка додаткового коду.
:::

## Крок 2. Базовий клас `Employee`

```csharp
class Employee
{
    private static int counter = 0;

    public string Id { get; }
    public string FullName { get; }
    public DateOnly HireDate { get; }

    public Employee(string fullName, DateOnly hireDate)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("ПІБ не може бути порожнім.");

        counter++;
        Id = $"EMP-{counter:D3}";
        FullName = fullName;
        HireDate = hireDate;
    }

    // Назва посади — кожен нащадок називає себе сам
    public virtual string Position => "Співробітник";

    // Головний віртуальний метод усієї системи
    public virtual decimal CalculateSalary() => 0m;

    // Розшифровка нарахування — для деталізованого звіту
    public virtual string SalaryDetails() => "нарахувань немає";

    public override string ToString()
        => $"{Id,-10}{FullName,-21}{Position,-23}{CalculateSalary(),12:N2}";
}
```

Що тут варто помітити:

- **статичний лічильник** `counter` з теми 15 працює на всю ієрархію: він
  оголошений у базовому класі, а конструктор базового класу викликається
  для будь-якого нащадка. Тому нумерація наскрізна;
- `CalculateSalary()` у базовому класі повертає `0m`. Це чесна відповідь
  на питання «скільки платять просто співробітнику» — ніскільки, бо категорію
  не вказано;
- `ToString()` уже поліморфний: усередині нього викликаються **віртуальні**
  `Position` і `CalculateSalary()`, тому один рядок форматування працює
  для всіх нащадків.

:::info Цікаво
Насправді клас `Employee` не має сенсу створювати напряму: «просто
співробітник» без категорії — це не жива сутність, а заготовка. У C# для
таких заготовок є **абстрактні класи**: `abstract class Employee` не дозволяє
писати `new Employee(...)`, а `abstract decimal CalculateSalary();` взагалі
не має тіла й **зобов'язує** кожного нащадка його реалізувати. Це тема 17,
і після неї ви повернетеся сюди й перепишете цей приклад значно чистіше.
:::

## Крок 3. Погодинний працівник

```csharp
class HourlyEmployee : Employee
{
    public const int NormalHours = 160;
    public const decimal OvertimeMultiplier = 1.5m;

    public decimal HourlyRate { get; }
    public int HoursWorked { get; }

    public HourlyEmployee(string fullName, DateOnly hireDate,
                          decimal hourlyRate, int hoursWorked)
        : base(fullName, hireDate)
    {
        if (hourlyRate <= 0)
            throw new ArgumentException("Ставка має бути додатною.");
        if (hoursWorked < 0)
            throw new ArgumentException("Години не можуть бути від'ємними.");

        HourlyRate = hourlyRate;
        HoursWorked = hoursWorked;
    }

    public override string Position => "Погодинний працівник";

    public override decimal CalculateSalary()
    {
        int normalHours = Math.Min(HoursWorked, NormalHours);
        int overtimeHours = Math.Max(0, HoursWorked - NormalHours);

        return normalHours * HourlyRate
             + overtimeHours * HourlyRate * OvertimeMultiplier;
    }

    public override string SalaryDetails()
    {
        int normalHours = Math.Min(HoursWorked, NormalHours);
        int overtimeHours = Math.Max(0, HoursWorked - NormalHours);

        string details = $"{normalHours} год × {HourlyRate:N2} = "
                       + $"{normalHours * HourlyRate:N2}";

        if (overtimeHours > 0)
        {
            decimal overtimeRate = HourlyRate * OvertimeMultiplier;
            details += $"; понаднормово {overtimeHours} год × {overtimeRate:N2}"
                     + $" = {overtimeHours * overtimeRate:N2}";
        }

        return details;
    }
}
```

Конструктор нащадка робить дві речі: передає спільні дані батькові через
`: base(fullName, hireDate)` і перевіряє свої власні параметри. Валідацію ПІБ
він не дублює — нею займається `Employee`.

## Крок 4. Штатний співробітник

```csharp
class SalariedEmployee : Employee
{
    public decimal MonthlySalary { get; }
    public decimal BonusPercent { get; }

    public SalariedEmployee(string fullName, DateOnly hireDate,
                            decimal monthlySalary, decimal bonusPercent = 0m)
        : base(fullName, hireDate)
    {
        if (monthlySalary <= 0)
            throw new ArgumentException("Оклад має бути додатним.");
        if (bonusPercent < 0 || bonusPercent > 100)
            throw new ArgumentException("Премія — від 0 до 100 відсотків.");

        MonthlySalary = monthlySalary;
        BonusPercent = bonusPercent;
    }

    public override string Position => "Штатний співробітник";

    protected decimal BonusAmount => MonthlySalary * BonusPercent / 100m;

    public override decimal CalculateSalary() => MonthlySalary + BonusAmount;

    public override string SalaryDetails()
        => $"оклад {MonthlySalary:N2} + премія {BonusPercent:N0}% ({BonusAmount:N2})";
}
```

Ось і `protected` у дії. Властивість `BonusAmount` не потрібна зовнішньому
світу — у звіті є вже готова сума. Але вона знадобиться нащадку `Manager`.
Саме такий випадок і виправдовує `protected`.

## Крок 5. Менеджер

```csharp
class Manager : SalariedEmployee
{
    private const decimal PercentPerSubordinate = 5m;
    private const decimal MaxTeamPercent = 50m;

    private readonly List<Employee> subordinates = [];

    public Manager(string fullName, DateOnly hireDate,
                   decimal monthlySalary, decimal bonusPercent = 0m)
        : base(fullName, hireDate, monthlySalary, bonusPercent)
    {
    }

    // Назовні віддаємо список тільки для читання —
    // додавати підлеглих можна лише через метод
    public IReadOnlyList<Employee> Subordinates => subordinates;

    public void AddSubordinate(Employee employee)
    {
        ArgumentNullException.ThrowIfNull(employee);

        if (ReferenceEquals(employee, this))
            throw new InvalidOperationException(
                "Менеджер не може підпорядковуватися сам собі.");

        if (subordinates.Contains(employee))
            return;

        subordinates.Add(employee);
    }

    private decimal TeamPercent
        => Math.Min(subordinates.Count * PercentPerSubordinate, MaxTeamPercent);

    private decimal TeamBonus => MonthlySalary * TeamPercent / 100m;

    public override string Position => $"Менеджер ({subordinates.Count} підлеглих)";

    // Беремо все, що нарахував би штатному співробітнику батьківський клас,
    // і додаємо надбавку за команду
    public override decimal CalculateSalary() => base.CalculateSalary() + TeamBonus;

    public override string SalaryDetails()
        => $"{base.SalaryDetails()} + за {subordinates.Count} підлеглих "
         + $"{TeamPercent:N0}% ({TeamBonus:N2})";
}
```

Найважливіший рядок у всьому класі:

```csharp
public override decimal CalculateSalary() => base.CalculateSalary() + TeamBonus;
```

Менеджер **не переписує** формулу «оклад плюс премія». Він каже: «порахуй,
як звичайному штатному, і додай моє». Якщо завтра компанія змінить правила
нарахування премії, правити доведеться тільки `SalariedEmployee` — менеджери
підхоплять зміну автоматично.

## Крок 6. Програма

```csharp
using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        var olena  = new HourlyEmployee("Олена Кравчук",
                                        new DateOnly(2023, 9, 4), 180m, 168);
        var maksym = new HourlyEmployee("Максим Гриценко",
                                        new DateOnly(2024, 2, 12), 150m, 152);
        var sofia  = new SalariedEmployee("Софія Бондаренко",
                                          new DateOnly(2021, 3, 15), 42000m, 10m);
        var andrii = new SalariedEmployee("Андрій Левченко",
                                          new DateOnly(2022, 11, 1), 38000m);
        var ihor   = new Manager("Ігор Мельник",
                                 new DateOnly(2019, 6, 10), 55000m, 5m);

        ihor.AddSubordinate(olena);
        ihor.AddSubordinate(maksym);
        ihor.AddSubordinate(sofia);
        ihor.AddSubordinate(andrii);

        // Масив БАЗОВОГО типу з об'єктами різних нащадків
        Employee[] staff = [olena, maksym, sofia, andrii, ihor];

        PrintPayroll(staff);
        PrintDetails(staff);
        PrintTeam(ihor);
        PrintSummary(staff);
    }

    static void PrintPayroll(Employee[] staff)
    {
        Console.WriteLine("=== ВІДОМІСТЬ НАРАХУВАННЯ ЗАРПЛАТИ ===\n");
        Console.WriteLine($"{"Табельний",-10}{"ПІБ",-21}{"Посада",-23}{"Нараховано",12}");
        Console.WriteLine(new string('-', 66));

        decimal total = 0m;
        foreach (Employee employee in staff)
        {
            Console.WriteLine(employee);          // ToString() поліморфний
            total += employee.CalculateSalary();  // CalculateSalary() теж
        }

        Console.WriteLine(new string('-', 66));
        Console.WriteLine($"{"РАЗОМ:",54}{total,12:N2}");
    }

    static void PrintDetails(Employee[] staff)
    {
        Console.WriteLine("\n=== ДЕТАЛІЗАЦІЯ ===\n");

        foreach (Employee employee in staff)
        {
            Console.WriteLine($"{employee.Id} {employee.FullName}");
            Console.WriteLine($"   {employee.SalaryDetails()}");
            Console.WriteLine($"   Разом: {employee.CalculateSalary():N2} грн\n");
        }
    }

    static void PrintTeam(Manager manager)
    {
        Console.WriteLine("=== КОМАНДА МЕНЕДЖЕРА ===\n");
        Console.WriteLine($"{manager.FullName} керує " +
                          $"{manager.Subordinates.Count} співробітниками:");

        foreach (Employee employee in manager.Subordinates)
            Console.WriteLine($"   - {employee.FullName} ({employee.Position})");
    }

    static void PrintSummary(Employee[] staff)
    {
        decimal total = 0m, hourlyTotal = 0m, salariedTotal = 0m;
        Employee best = staff[0];
        Employee least = staff[0];

        foreach (Employee employee in staff)
        {
            decimal salary = employee.CalculateSalary();
            total += salary;

            if (salary > best.CalculateSalary()) best = employee;
            if (salary < least.CalculateSalary()) least = employee;

            // Перевірка категорії через pattern matching
            if (employee is HourlyEmployee)
                hourlyTotal += salary;
            else if (employee is SalariedEmployee)
                salariedTotal += salary;
        }

        Console.WriteLine("\n=== ПІДСУМКИ ===\n");
        Console.WriteLine($"{"Співробітників:",-22}{staff.Length,12}");
        Console.WriteLine($"{"Фонд оплати праці:",-22}{total,12:N2} грн");
        Console.WriteLine($"{"Середня зарплата:",-22}{total / staff.Length,12:N2} грн");
        Console.WriteLine($"{"Погодинна оплата:",-22}{hourlyTotal,12:N2} грн");
        Console.WriteLine($"{"Штатні (з менеджером):",-22}{salariedTotal,12:N2} грн");
        Console.WriteLine();
        Console.WriteLine($"Найбільша виплата: {best.FullName} — " +
                          $"{best.CalculateSalary():N2} грн");
        Console.WriteLine($"Найменша виплата:  {least.FullName} — " +
                          $"{least.CalculateSalary():N2} грн");
    }
}
```

## Повний вивід програми

```
=== ВІДОМІСТЬ НАРАХУВАННЯ ЗАРПЛАТИ ===

Табельний ПІБ                  Посада                   Нараховано
------------------------------------------------------------------
EMP-001   Олена Кравчук        Погодинний працівник      30 960,00
EMP-002   Максим Гриценко      Погодинний працівник      22 800,00
EMP-003   Софія Бондаренко     Штатний співробітник      46 200,00
EMP-004   Андрій Левченко      Штатний співробітник      38 000,00
EMP-005   Ігор Мельник         Менеджер (4 підлеглих)    68 750,00
------------------------------------------------------------------
                                                РАЗОМ:  206 710,00

=== ДЕТАЛІЗАЦІЯ ===

EMP-001 Олена Кравчук
   160 год × 180,00 = 28 800,00; понаднормово 8 год × 270,00 = 2 160,00
   Разом: 30 960,00 грн

EMP-002 Максим Гриценко
   152 год × 150,00 = 22 800,00
   Разом: 22 800,00 грн

EMP-003 Софія Бондаренко
   оклад 42 000,00 + премія 10% (4 200,00)
   Разом: 46 200,00 грн

EMP-004 Андрій Левченко
   оклад 38 000,00 + премія 0% (0,00)
   Разом: 38 000,00 грн

EMP-005 Ігор Мельник
   оклад 55 000,00 + премія 5% (2 750,00) + за 4 підлеглих 20% (11 000,00)
   Разом: 68 750,00 грн

=== КОМАНДА МЕНЕДЖЕРА ===

Ігор Мельник керує 4 співробітниками:
   - Олена Кравчук (Погодинний працівник)
   - Максим Гриценко (Погодинний працівник)
   - Софія Бондаренко (Штатний співробітник)
   - Андрій Левченко (Штатний співробітник)

=== ПІДСУМКИ ===

Співробітників:                  5
Фонд оплати праці:      206 710,00 грн
Середня зарплата:        41 342,00 грн
Погодинна оплата:        53 760,00 грн
Штатні (з менеджером):  152 950,00 грн

Найбільша виплата: Ігор Мельник — 68 750,00 грн
Найменша виплата:  Максим Гриценко — 22 800,00 грн
```

## Розбір: чому це працює саме так

### Один цикл — п'ять різних формул

Подивіться на серце програми:

```csharp
foreach (Employee employee in staff)
{
    Console.WriteLine(employee);
    total += employee.CalculateSalary();
}
```

Тут немає жодної згадки про години, оклади чи підлеглих. Метод `PrintPayroll`
знає рівно одне: у нього є `Employee`, і в `Employee` є `CalculateSalary()`.
Все інше вирішує пізнє зв'язування.

### Менеджер потрапив у «штатних»

У методі `PrintSummary` перевірка написана так:

```csharp
if (employee is HourlyEmployee)
    hourlyTotal += salary;
else if (employee is SalariedEmployee)
    salariedTotal += salary;
```

Менеджер потрапив у `salariedTotal`, хоча його клас називається `Manager`.
Це не баг, а прямий наслідок наслідування: `Manager` **є**
`SalariedEmployee`, тому `is` повертає `true`.

:::warning Обережно
Порядок гілок тут критичний. Якби `Manager` перевірявся **після**
`SalariedEmployee`, до гілки менеджера керування ніколи б не дійшло —
попередня умова спрацювала б першою. Правило просте: перевіряйте
**від найконкретнішого типу до найзагальнішого**.

Якщо потрібен точний тип, а не «є», використовуйте `employee.GetType() ==
typeof(SalariedEmployee)`. Але потреба в цьому — привід задуматися, чи
не варто натомість додати віртуальний член.
:::

### Додаємо нову категорію

Перевірмо головну обіцянку: додати новий тип співробітника без правок
у звіті. Нехай з'явилися працівники за контрактом — фіксована сума за проєкт.

```csharp
class ContractEmployee : Employee
{
    public string ProjectName { get; }
    public decimal ContractAmount { get; }

    public ContractEmployee(string fullName, DateOnly hireDate,
                            string projectName, decimal contractAmount)
        : base(fullName, hireDate)
    {
        ProjectName = projectName;
        ContractAmount = contractAmount;
    }

    public override string Position => "Контракт";

    public override decimal CalculateSalary() => ContractAmount;

    public override string SalaryDetails()
        => $"контракт «{ProjectName}»: {ContractAmount:N2}";
}
```

Щоб він потрапив у звіт, треба дописати **один рядок** — створення об'єкта
й додавання його в масив `staff`. Методи `PrintPayroll`, `PrintDetails`
і `PrintSummary` не змінюються **взагалі**. Саме це відрізняє ООП-код
від «процедурного коду з класами».

## Що ми отримали

| Прийом теми | Де використано |
|---|---|
| Наслідування | три нащадки `Employee`, трирівнева ієрархія |
| `base(...)` у конструкторі | кожен нащадок передає ПІБ і дату батькові |
| `base.Method()` | `Manager.CalculateSalary()` і `Manager.SalaryDetails()` |
| `protected` | `BonusAmount` — видно менеджеру, не видно зовні |
| `virtual` / `override` | `Position`, `CalculateSalary`, `SalaryDetails` |
| Перевизначення `ToString()` | один рядок відомості для всіх типів |
| Динамічний поліморфізм | `Employee[]` з об'єктами різних класів |
| Композиція | `List<Employee>` усередині менеджера |
| Pattern matching | розподіл сум за категоріями |
| Статичне поле | наскрізна нумерація табельних номерів |

## Типові помилки

**1. Забутий `virtual` у базовому класі.**
Метод `CalculateSalary()` без `virtual` перетворює всю цю систему на купу
нулів: у циклі викликалася б базова версія, яка повертає `0m`. Найгірше,
що програма при цьому чудово компілюється і працює — просто видає
неправильну відомість. Якщо у звіті раптом суцільні нулі або однакові
значення — першим ділом перевіряйте `virtual`.

**2. `new` замість `override`.**
Симптом той самий: напряму (`ihor.CalculateSalary()`) все правильно,
а у відомості через `Employee[]` — базові значення. Компілятор попереджає
про це (CS0114), і це попередження треба читати.

**3. Наслідування заради повторного використання коду.**
Спокуса: «у менеджера є список підлеглих і в відділу є список співробітників —
зроблю `class Department : Manager`». Перевірка реченням одразу все
розставляє: «відділ **є** менеджером» — очевидна нісенітниця. Відділ **має**
менеджера і **має** співробітників, отже — композиція.

**4. Надто глибока ієрархія.**
`Employee` → `SalariedEmployee` → `Manager` → `SeniorManager` →
`DepartmentHead` → `Director`. Кожен рівень додає по одному полю, а щоб
зрозуміти, як рахується зарплата директора, доводиться відкрити шість
файлів. Якщо рівнів більше трьох — швидше за все, різницю між ними краще
виразити полем (наприклад, `ManagementLevel`), а не окремим класом.

**5. Копіювання валідації в кожного нащадка.**
Якщо ви бачите однакову перевірку ПІБ у трьох конструкторах — ви забули,
що для цього і є базовий клас. Валідація спільних даних живе в конструкторі
`Employee`, і кожен нащадок отримує її безкоштовно через `: base(...)`.
