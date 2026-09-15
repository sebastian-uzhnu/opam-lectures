---
sidebar_position: 2
---

# Реалізація: моделі та сервіси

План із попереднього підрозділу є, папки створені. Тепер пишемо код —
знизу вгору, як домовлялися: спочатку модель, потім контракт сховища,
потім сервіс.

Для кожного класу ми будемо не просто наводити код, а відповідати на два
питання: **чому саме так** і **що було б, якби інакше**. Копіювати чужі рішення
легко; розуміти їх — і є те, заради чого ця тема стоїть останньою в семестрі.

## Крок 1. Категорії — чому `enum`, а не рядок

За ТЗ категорія обирається зі сталого списку: їжа, транспорт, житло, розваги,
здоров'я, навчання, інше. Спокуса зберігати категорію рядком велика:
`expense.Category = "Їжа"`. Не робіть так.

| | `string Category` | `enum ExpenseCategory` |
|---|---|---|
| Помилка в написанні | «Їжв» компілюється, зламається лише статистика | не скомпілюється взагалі |
| Список допустимих значень | ніде не записаний | сам тип і є списком |
| Підказки IDE | немає | повний список після крапки |
| Порівняння | треба думати про регістр і пробіли | звичайне `==` |
| `switch` | компілятор не перевірить повноту | перевірить і попередить |

Правило: **якщо варіантів скінченна кількість і вони відомі заздалегідь —
це `enum`**.

```csharp
// файл Models/ExpenseCategory.cs
namespace ExpenseTracker.Models;

/// <summary>Категорія витрати. Числа задані явно, щоб їх можна було
/// безпечно зберігати у файлі й показувати в меню.</summary>
public enum ExpenseCategory
{
    Food = 1,
    Transport = 2,
    Housing = 3,
    Entertainment = 4,
    Health = 5,
    Education = 6,
    Other = 7
}
```

Чому числа проставлені руками, а не залишені за замовчуванням? За замовчуванням
перший елемент отримав би `0`, другий `1` і так далі. Це працює доти, доки
хтось не вставить нову категорію **посередині** списку — тоді всі наступні
зсунуться на одиницю, і старий файл із даними почне читатися неправильно:
вчорашній «транспорт» перетвориться на «житло». Явні числа роблять зв'язок
«назва — число» фіксованим назавжди.

:::warning[Обережно]
Нумерація з `1`, а не з `0`, тут не випадкова. У меню категорії показуються
списком, і людині природно натиснути `1` для першого пункту. Якщо `Food = 0`,
доведеться постійно писати `choice - 1`, і рано чи пізно ви помилитеся зі
зсувом. Один раз домовитись про нумерацію з одиниці — дешевше.
:::

### Українські назви

Ідентифікатори в C# пишуть англійською — це стандарт індустрії, і `Food`
читається однаково у Львові та Осло. Але користувачеві треба показати «Їжа».
Переклад — окрема робота, отже, окремий клас.

```csharp
// файл Models/CategoryNames.cs
namespace ExpenseTracker.Models;

/// <summary>Перекладає категорії на українську для показу користувачеві.</summary>
public static class CategoryNames
{
    public static string Get(ExpenseCategory category) => category switch
    {
        ExpenseCategory.Food => "Їжа",
        ExpenseCategory.Transport => "Транспорт",
        ExpenseCategory.Housing => "Житло",
        ExpenseCategory.Entertainment => "Розваги",
        ExpenseCategory.Health => "Здоров'я",
        ExpenseCategory.Education => "Навчання",
        ExpenseCategory.Other => "Інше",
        _ => "Невідома"
    };

    /// <summary>Усі категорії по порядку — для меню вибору.</summary>
    public static ExpenseCategory[] All() => Enum.GetValues<ExpenseCategory>();
}
```

Тут одразу три сучасні дрібниці, які варто помітити.

**`switch`-вираз** (з `=>` замість `case`/`break`) коротший за звичайний
`switch`-оператор і, головне, зобов'язує повернути значення для кожної гілки.
Прочерк `_` — гілка «все інше»; без неї компілятор попередить, що ви могли
щось пропустити.

**`Enum.GetValues<ExpenseCategory>()`** — узагальнена версія методу, доступна
з .NET 5. Вона повертає одразу `ExpenseCategory[]`, а не `Array`, який довелося б
приводити до типу.

**Клас `static`** — у нього немає стану, створювати його об'єкт немає сенсу.
Модифікатор `static` на класі забороняє `new CategoryNames()` на рівні
компілятора.

## Крок 2. Клас `Expense`

Головна сутність проєкту. Її завдання — зберігати дані однієї витрати
**і не дозволяти привести себе в неможливий стан**.

```csharp
// файл Models/Expense.cs
namespace ExpenseTracker.Models;

/// <summary>Одна витрата: коли, скільки, на що і з приміткою.</summary>
public class Expense
{
    // Межі допустимих значень — константами, а не «магічними числами» у коді.
    public const decimal MinAmount = 0.01m;
    public const decimal MaxAmount = 1_000_000m;
    public const int MaxNoteLength = 60;

    private DateOnly date;
    private decimal amount;
    private ExpenseCategory category;
    private string note = string.Empty;

    public Expense(DateOnly date, decimal amount, ExpenseCategory category, string note)
    {
        // Присвоюємо через властивості, а не через поля,
        // щоб спрацювала вся валідація.
        Date = date;
        Amount = amount;
        Category = category;
        Note = note;
    }

    /// <summary>Порядковий номер. Видає сервіс, тому сеттер публічний.</summary>
    public int Id { get; set; }

    public DateOnly Date
    {
        get => date;
        set
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            if (value > today)
            {
                throw new ArgumentException(
                    $"Дата витрати не може бути в майбутньому (сьогодні {today:dd.MM.yyyy}).");
            }
            date = value;
        }
    }

    public decimal Amount
    {
        get => amount;
        set
        {
            if (value < MinAmount)
            {
                throw new ArgumentException(
                    $"Сума витрати має бути не меншою за {MinAmount:N2} грн.");
            }
            if (value > MaxAmount)
            {
                throw new ArgumentException(
                    $"Сума витрати не може перевищувати {MaxAmount:N2} грн.");
            }
            amount = Math.Round(value, 2);
        }
    }

    public ExpenseCategory Category
    {
        get => category;
        set
        {
            if (!Enum.IsDefined(value))
            {
                throw new ArgumentException($"Невідома категорія: {(int)value}.");
            }
            category = value;
        }
    }

    public string Note
    {
        get => note;
        set
        {
            var cleaned = (value ?? string.Empty).Trim();
            note = cleaned.Length > MaxNoteLength
                ? cleaned[..MaxNoteLength]
                : cleaned;
        }
    }

    public override string ToString() =>
        $"#{Id,-4} {Date:dd.MM.yyyy}  {Amount,10:N2} грн  " +
        $"{CategoryNames.Get(Category),-12} {Note}";
}
```

### Розбираємо рішення

**Чому `decimal`, а не `double`.** Це найважливіше рішення у класі. Тип `double`
зберігає число у двійковій системі, і десяткові дроби на кшталт `0.1` в ньому
не представляються точно. Класична демонстрація:

```csharp
double a = 0.1 + 0.2;
Console.WriteLine(a == 0.3);   // False!
Console.WriteLine(a);          // 0,30000000000000004

decimal b = 0.1m + 0.2m;
Console.WriteLine(b == 0.3m);  // True
Console.WriteLine(b);          // 0,3
```

**Вивід:**

```
False
0,30000000000000004
True
0,3
```

Для грошей це неприпустимо: тисяча дрібних витрат накопичить помилку в копійках,
і підсумок не зійдеться. Тип `decimal` зберігає число в десятковій системі
і саме для грошей і створений. Розплата — він приблизно у 20 разів повільніший
за `double`, але нам байдуже: ми не рахуємо мільярд операцій за секунду.

Суфікс `m` в `0.01m` обов'язковий: без нього літерал вважається `double`
і не компілюється у контексті `decimal`.

**Чому `DateOnly`, а не `DateTime`.** Витрата — це подія певного дня. Години
й хвилини нам не потрібні, а `DateTime` їх обов'язково тягне за собою.
Наслідок: два записи «3 листопада» можуть виявитися нерівними, бо в одного
`00:00:00`, а в іншого `14:32:07`. Тип `DateOnly` (з'явився у .NET 6) прибирає
цю проблему цілком.

:::info[Цікаво]
`DateOnly` всередині — це просто `int` із кількістю днів від 1 січня 1 року.
Тому порівняння дат `a.Date > b.Date` — це порівняння двох цілих чисел,
швидке й точне. А от порівнювати `DateTime` на рівність майже завжди помилка:
там сотні наносекунд.
:::

**Чому валідація у сеттері, а не в конструкторі.** Можна було б перевірити
все один раз у конструкторі. Але тоді після створення об'єкта ніщо не завадить
написати `expense.Amount = -500`. Валідація у сеттері працює **завжди** —
і при створенні (бо конструктор присвоює через властивості), і при будь-якій
подальшій зміні. Об'єкт стає неможливо зіпсувати.

**Чому виняток, а не `bool` або тихе виправлення.** Три можливі реакції
на некоректне значення:

| Реакція | Коли доречна | Наш випадок |
|---|---|---|
| кинути виняток | значення взагалі неприпустиме, це помилка виклику | сума, дата, категорія |
| повернути `false` | «не вдалося» — нормальний хід подій | видалення неіснуючого номера |
| мовчки виправити | дані косметичні, втрата неважлива | обрізання довгої нотатки |

Від'ємна сума — не «нормальний хід подій», а помилка. Якщо мовчки замінити її
на нуль, користувач ніколи не дізнається, що його дані спотворили. Виняток
голосно повідомляє: так не можна.

А от нотатка обрізається тихо: якщо людина написала роман на 300 символів,
нам не шкода взяти перші 60. Втрата тут косметична.

**Чому `note = string.Empty`, а не `null`.** Поле-рядок за замовчуванням
дорівнює `null`, і будь-яке `note.Length` дасть `NullReferenceException`.
Ініціалізація порожнім рядком і `(value ?? string.Empty)` у сеттері гарантують,
що `Note` **ніколи** не буде `null`. Це називають «уникати null там, де можна».

**Що робить `cleaned[..MaxNoteLength]`.** Це **оператор діапазону** (range,
C# 8): взяти підрядок від початку до 60-го символу. Еквівалент
`cleaned.Substring(0, MaxNoteLength)`, але коротший і читабельніший.

**`Enum.IsDefined(value)`** перевіряє, що число справді відповідає одному
з оголошених варіантів. Це потрібно, бо C# дозволяє
`(ExpenseCategory)99` — приведення не перевіряється. Такий «неможливий»
enum легко приїде з зіпсованого файлу, і краще спіймати його на вході.

:::danger[Часта помилка]
У конструкторі писати `this.amount = amount;` замість `Amount = amount;`.
Присвоєння прямо в поле **обходить валідацію**, і конструктор радісно створює
витрату на мінус тисячу гривень. Правило: усередині класу теж звертайтеся
до даних через властивості, якщо у властивості є логіка.
:::

### Перевіряємо модель

Створіть тимчасово такий `Program.cs` і запустіть:

```csharp
using System.Globalization;
using ExpenseTracker.Models;

CultureInfo.CurrentCulture = new CultureInfo("uk-UA");
Console.OutputEncoding = System.Text.Encoding.UTF8;

var good = new Expense(new DateOnly(2025, 11, 3), 245.5m,
                       ExpenseCategory.Food, "Продукти на тиждень");
good.Id = 1;
Console.WriteLine(good);

// Тепер навмисно ламаємо
string[] cases = ["від'ємна сума", "майбутня дата", "неіснуюча категорія"];
Action[] attempts =
[
    () => new Expense(new DateOnly(2025, 11, 3), -50m, ExpenseCategory.Food, ""),
    () => new Expense(new DateOnly(2099, 1, 1), 10m, ExpenseCategory.Food, ""),
    () => new Expense(new DateOnly(2025, 11, 3), 10m, (ExpenseCategory)99, "")
];

for (int i = 0; i < cases.Length; i++)
{
    try
    {
        attempts[i]();
        Console.WriteLine($"{cases[i]}: помилки не було — це погано!");
    }
    catch (ArgumentException ex)
    {
        Console.WriteLine($"{cases[i]}: {ex.Message}");
    }
}
```

**Вивід:**

```
#1    03.11.2025      245,50 грн  Їжа          Продукти на тиждень
від'ємна сума: Сума витрати має бути не меншою за 0,01 грн.
майбутня дата: Дата витрати не може бути в майбутньому (сьогодні 14.11.2025).
неіснуюча категорія: Невідома категорія: 99.
```

Це — **найпростіший вид тестування**: ви навмисно подаєте погані дані
й перевіряєте, що клас чинить опір. Робіть так після кожного написаного класу,
не чекаючи, поки збереться весь проєкт.

:::note
Масив делегатів `Action[]` тут — просто зручний спосіб перелічити три спроби
в циклі. `Action` — це делегат «метод без параметрів і без результату»;
`() => ...` — лямбда, яка створює такий метод на місці. Якщо делегати ще
відчуваються складно, напишіть три окремі `try`/`catch` — результат той самий.
:::

## Крок 3. Контракт сховища

Перш ніж писати сервіс, треба відповісти на питання: як він зберігатиме дані?
Але **не** «у якому форматі» — це деталь, яка сервісу нецікава. Йому потрібні
лише дві дії: віддай усе, що є, і збережи оце.

```csharp
// файл Storage/IExpenseStorage.cs
using ExpenseTracker.Models;

namespace ExpenseTracker.Storage;

/// <summary>Контракт сховища витрат. Де саме лежать дані — не наша справа.</summary>
public interface IExpenseStorage
{
    /// <summary>Читає всі витрати. Якщо даних ще немає — порожній список.</summary>
    List<Expense> Load();

    /// <summary>Повністю перезаписує сховище переданим списком.</summary>
    void Save(IReadOnlyList<Expense> expenses);

    /// <summary>Опис сховища для головного меню, наприклад шлях до файлу.</summary>
    string Description { get; }
}
```

Дванадцять рядків, жодної реалізації — і це найважливіший файл у проєкті.
Він фіксує **межу між шарами**.

**Чому `Load` повертає `List<Expense>`, а `Save` приймає `IReadOnlyList<Expense>`.**
Тут працює загальне правило: **вимагай якнайменше, віддавай зручне**.
Методу `Save` потрібно лише пройтися по елементах — тож він оголошує
найслабшу вимогу, `IReadOnlyList`. Заразом сигнатура вголос обіцяє: «я твій
список не зміню». А `Load` повертає повноцінний `List`, бо той, хто отримав
дані, зазвичай хоче їх додавати й сортувати.

**Чому немає методу `Add`.** Спокуса зробити `storage.Add(expense)` велика,
але тоді сховище мусило б стежити за станом колекції — а це вже робота сервісу.
Наше сховище тупе: дали список — записало, попросили — прочитало.

**Чому `Description` — властивість, а не метод.** Це просто дані про об'єкт,
без обчислень і побічних ефектів. Загальне правило: якщо звертання схоже
на читання поля й виконується миттєво — властивість; якщо це дія або серйозна
робота — метод.

:::tip[Порада]
Пишучи інтерфейс, читайте його вголос як речення: «сховище вміє
завантажити витрати, зберегти витрати й описати себе». Якщо речення звучить
природно — інтерфейс, найімовірніше, вдалий. Якщо доводиться пояснювати
через «ну, тут ще треба спочатку...» — щось не так.
:::

## Крок 4. Сервіс — мозок застосунку

Тепер найбільший клас проєкту. Він тримає колекцію витрат у пам'яті, видає
номери, шукає, фільтрує й рахує статистику.

```csharp
// файл Services/ExpenseService.cs
using ExpenseTracker.Models;
using ExpenseTracker.Storage;

namespace ExpenseTracker.Services;

/// <summary>Уся логіка роботи з витратами. Про консоль і файли не знає.</summary>
public class ExpenseService
{
    private readonly List<Expense> expenses = [];
    private readonly IExpenseStorage storage;
    private int nextId = 1;

    public ExpenseService(IExpenseStorage storage)
    {
        this.storage = storage;
    }

    public int Count => expenses.Count;

    public string StorageDescription => storage.Description;

    // ---------- завантаження і збереження ----------

    /// <summary>Читає дані зі сховища і відновлює лічильник номерів.</summary>
    public void Load()
    {
        expenses.Clear();
        expenses.AddRange(storage.Load());

        nextId = 1;
        foreach (var expense in expenses)
        {
            if (expense.Id >= nextId)
            {
                nextId = expense.Id + 1;
            }
        }
    }

    public void Save() => storage.Save(expenses);

    // ---------- зміна даних ----------

    public Expense Add(DateOnly date, decimal amount,
                       ExpenseCategory category, string note)
    {
        var expense = new Expense(date, amount, category, note) { Id = nextId };
        nextId++;
        expenses.Add(expense);
        return expense;
    }

    /// <summary>Видаляє витрату за номером. Повертає false, якщо номера немає.</summary>
    public bool Remove(int id)
    {
        for (int i = 0; i < expenses.Count; i++)
        {
            if (expenses[i].Id == id)
            {
                expenses.RemoveAt(i);
                return true;
            }
        }
        return false;
    }

    // ---------- пошук і фільтрація ----------

    /// <summary>Базовий фільтр: повертає всі витрати, що задовольняють умову.</summary>
    public List<Expense> Find(Predicate<Expense> match)
    {
        var result = new List<Expense>();
        foreach (var expense in expenses)
        {
            if (match(expense))
            {
                result.Add(expense);
            }
        }
        return result;
    }

    public List<Expense> All() => Find(expense => true);

    public List<Expense> ByCategory(ExpenseCategory category) =>
        Find(expense => expense.Category == category);

    public List<Expense> ForMonth(int year, int month) =>
        Find(expense => expense.Date.Year == year && expense.Date.Month == month);

    // ---------- обчислення ----------

    public static List<Expense> SortedByDate(List<Expense> items)
    {
        var copy = new List<Expense>(items);
        copy.Sort((a, b) => a.Date.CompareTo(b.Date));
        return copy;
    }

    public static decimal Total(List<Expense> items)
    {
        decimal sum = 0m;
        foreach (var expense in items)
        {
            sum += expense.Amount;
        }
        return sum;
    }

    public static Dictionary<ExpenseCategory, decimal> TotalsByCategory(List<Expense> items)
    {
        var totals = new Dictionary<ExpenseCategory, decimal>();
        foreach (var expense in items)
        {
            if (totals.ContainsKey(expense.Category))
            {
                totals[expense.Category] += expense.Amount;
            }
            else
            {
                totals[expense.Category] = expense.Amount;
            }
        }
        return totals;
    }

    /// <summary>Найбільша окрема витрата або null, якщо список порожній.</summary>
    public static Expense? Largest(List<Expense> items)
    {
        if (items.Count == 0)
        {
            return null;
        }

        var largest = items[0];
        foreach (var expense in items)
        {
            if (expense.Amount > largest.Amount)
            {
                largest = expense;
            }
        }
        return largest;
    }

    /// <summary>Середні витрати на день місяця. Для поточного місяця ділимо
    /// на кількість днів, що вже минули, — інакше цифра буде оптимістично малою.</summary>
    public static decimal AveragePerDay(List<Expense> items, int year, int month)
    {
        int days = DateTime.DaysInMonth(year, month);

        var today = DateTime.Today;
        if (year == today.Year && month == today.Month)
        {
            days = today.Day;
        }

        return days == 0 ? 0m : Math.Round(Total(items) / days, 2);
    }
}
```

### Розбираємо рішення

**`private readonly List<Expense> expenses = [];`** Модифікатор `readonly`
означає: посилання на список не можна замінити іншим списком після створення
об'єкта. Додавати й видаляти елементи при цьому **можна** — `readonly`
захищає саме посилання, а не вміст. Це рівно те, що нам треба: ніхто
випадково не підмінить усю колекцію.

Запис `[]` — **колекційний вираз** (collection expression) з C# 12,
короткий синонім `new List<Expense>()`.

**Конструктор приймає сховище ззовні.** Сервіс не створює
`new CsvExpenseStorage(...)` сам. Він приймає готовий об'єкт через конструктор
і працює з ним через інтерфейс. Це і є те саме «впровадження залежності»,
про яке йшлося в попередньому підрозділі. Наслідок: у тесті ми підсунемо
сервісу сховище в пам'яті, і жоден файл не постраждає.

**Лічильник `nextId` відновлюється при завантаженні.** Найпоширеніша помилка
в таких проєктах: запустити програму вдруге, додати витрату — і отримати
дублікат номера 1. Цикл після `AddRange` знаходить максимальний уже
використаний номер і продовжує з наступного.

Зверніть увагу: ми **не** використовуємо `expenses.Count + 1`. Якщо видалити
запис із середини, кількість зменшиться, і наступний доданий запис отримає
вже зайнятий номер.

**Метод `Find` із делегатом.** Ось найелегантніша частина сервісу. Замість
трьох майже однакових методів із трьома майже однаковими циклами ми пишемо
**один** цикл, а умову передаємо параметром.

`Predicate<Expense>` — вбудований делегат, що означає «метод, який приймає
`Expense` і повертає `bool`». Виклик `match(expense)` виконує ту умову, яку
передав викликач.

```csharp
// Три різні запити — один цикл усередині
var food = service.ByCategory(ExpenseCategory.Food);
var november = service.ForMonth(2025, 11);
var big = service.Find(expense => expense.Amount > 1000m);
```

Останній рядок показує головну перевагу: **UI може задати умову, якої в сервісі
не передбачено**, і сервіс не доведеться змінювати.

:::info[Цікаво]
Те, що ми зробили руками, у промисловому коді роблять через **LINQ**:
`expenses.Where(e => e.Amount > 1000).Sum(e => e.Amount)`. Під капотом LINQ
влаштований так само — цикл плюс делегат-умова. Ми пишемо цикли вручну
свідомо: коли ви побачите LINQ у наступному семестрі, для вас це буде
не магія, а знайомий механізм із гарним синтаксисом.
:::

**Обчислювальні методи — `static`.** `Total`, `TotalsByCategory`, `Largest`,
`SortedByDate` не звертаються до полів об'єкта: вони працюють **із тим списком,
який їм дали**. Модифікатор `static` це чесно декларує. Побічна вигода:
їх можна застосувати до будь-якого списку — усіх витрат, витрат за місяць,
результату довільного фільтра.

```csharp
var november = service.ForMonth(2025, 11);
decimal monthTotal = ExpenseService.Total(november);          // за місяць
decimal foodTotal = ExpenseService.Total(service.ByCategory(ExpenseCategory.Food));
```

**`SortedByDate` повертає копію.** Рядок `new List<Expense>(items)` створює
новий список, і `Sort` перевпорядковує вже його. Якби ми викликали
`items.Sort(...)` напряму, метод мовчки змінив би список, який йому дали, —
а це неприємний сюрприз для викликача. Метод із назвою «SortedByDate»
має **повертати** відсортоване, а не переставляти чуже.

`copy.Sort((a, b) => a.Date.CompareTo(b.Date))` — це `Comparison<Expense>`,
ще один вбудований делегат: приймає два елементи, повертає від'ємне число,
нуль або додатне залежно від порядку.

**`Expense?` у `Largest`.** Знак питання — це **nullable reference type**:
чесне попередження «тут може бути `null`». Компілятор змусить викликача
перевірити результат перед використанням. Порожній список — цілком реальний
випадок (місяць без витрат), і тихо повернути витрату на нуль гривень було б
брехнею.

**`AveragePerDay` і поточний місяць.** Якщо сьогодні 5 листопада, а ми поділимо
витрати на 30 днів, середнє вийде вшестеро заниженим. Перевірка на поточний
місяць — приклад того, що ТЗ не описує всього, і частину рішень доводиться
приймати самому. Такі рішення обов'язково коментуйте.

## Перевіряємо сервіс без жодного файлу

Сховища ще немає — воно буде в наступному підрозділі. Але перевірити сервіс
можна вже зараз: напишемо крихітну реалізацію інтерфейсу, яка тримає дані
в пам'яті.

```csharp
// файл Storage/InMemoryStorage.cs
using ExpenseTracker.Models;

namespace ExpenseTracker.Storage;

/// <summary>Сховище-заглушка для перевірок. Дані живуть лише поки працює програма.</summary>
public class InMemoryStorage : IExpenseStorage
{
    private List<Expense> saved = [];

    public string Description => "пам'ять (дані не зберігаються)";

    public List<Expense> Load() => new List<Expense>(saved);

    public void Save(IReadOnlyList<Expense> expenses) => saved = new List<Expense>(expenses);
}
```

Тепер тимчасовий `Program.cs`:

```csharp
using System.Globalization;
using ExpenseTracker.Models;
using ExpenseTracker.Services;
using ExpenseTracker.Storage;

CultureInfo.CurrentCulture = new CultureInfo("uk-UA");
Console.OutputEncoding = System.Text.Encoding.UTF8;

var service = new ExpenseService(new InMemoryStorage());

service.Add(new DateOnly(2025, 11, 3), 245.50m, ExpenseCategory.Food, "Продукти на тиждень");
service.Add(new DateOnly(2025, 11, 5), 32.00m, ExpenseCategory.Transport, "Метро");
service.Add(new DateOnly(2025, 11, 12), 1800.00m, ExpenseCategory.Housing, "Комуналка");
service.Add(new DateOnly(2025, 11, 15), 180.00m, ExpenseCategory.Entertainment, "Кіно з друзями");
service.Add(new DateOnly(2025, 11, 20), 95.20m, ExpenseCategory.Food, "Кава і бургер");

Console.WriteLine("--- Усі витрати за датою ---");
foreach (var expense in ExpenseService.SortedByDate(service.All()))
{
    Console.WriteLine(expense);
}

var november = service.ForMonth(2025, 11);
Console.WriteLine();
Console.WriteLine($"Витрат за листопад: {november.Count}");
Console.WriteLine($"Разом: {ExpenseService.Total(november):N2} грн");
Console.WriteLine($"У середньому на день: {ExpenseService.AveragePerDay(november, 2025, 11):N2} грн");
Console.WriteLine($"Найбільша: {ExpenseService.Largest(november)}");

Console.WriteLine();
Console.WriteLine("--- За категоріями ---");
foreach (var pair in ExpenseService.TotalsByCategory(november))
{
    Console.WriteLine($"{CategoryNames.Get(pair.Key),-12} {pair.Value,10:N2} грн");
}

Console.WriteLine();
Console.WriteLine("--- Витрати понад 200 грн (довільний фільтр) ---");
foreach (var expense in service.Find(expense => expense.Amount > 200m))
{
    Console.WriteLine(expense);
}
```

**Вивід:**

```
--- Усі витрати за датою ---
#1    03.11.2025      245,50 грн  Їжа          Продукти на тиждень
#2    05.11.2025       32,00 грн  Транспорт    Метро
#3    12.11.2025    1 800,00 грн  Житло        Комуналка
#4    15.11.2025      180,00 грн  Розваги      Кіно з друзями
#5    20.11.2025       95,20 грн  Їжа          Кава і бургер

Витрат за листопад: 5
Разом: 2 352,70 грн
У середньому на день: 78,42 грн
Найбільша: #3    12.11.2025    1 800,00 грн  Житло        Комуналка

--- За категоріями ---
Їжа              340,70 грн
Транспорт         32,00 грн
Житло          1 800,00 грн
Розваги          180,00 грн

--- Витрати понад 200 грн (довільний фільтр) ---
#1    03.11.2025      245,50 грн  Їжа          Продукти на тиждень
#3    12.11.2025    1 800,00 грн  Житло        Комуналка
```

Сервіс працює. Жодного файлу не створено, жодного меню не написано —
а логіка вже перевірена. Це і є вигода від поділу на шари в чистому вигляді.

:::tip[Порада]
Такий тимчасовий `Program.cs` не викидайте одразу — збережіть його вміст
в окремий метод, наприклад `DemoData.Fill(service)`. Під час розробки меню
дуже зручно щоразу стартувати з п'ятьма готовими витратами, а не вводити
їх руками.
:::

## Типові помилки

**Зберігати категорію рядком.** Одна одруківка — і витрата назавжди випадає
зі статистики, причому мовчки. `enum` перетворює цю помилку на помилку
компіляції.

**Використовувати `double` для грошей.** Виглядає нормально на п'яти записах
і розсипається на п'ятистах. Для грошей завжди `decimal`.

**Присвоювати полю в обхід властивості.** `this.amount = amount` у конструкторі
скасовує всю валідацію, яку ви щойно написали. Присвоюйте через властивість.

**Видавати номер як `Count + 1`.** Після першого ж видалення з середини списку
номери почнуть повторюватися. Тримайте окремий лічильник і відновлюйте його
при завантаженні.

**Писати окремий метод із власним циклом на кожен фільтр.** Через п'ять
фільтрів це п'ять майже однакових циклів, і виправляти помилку доведеться
в п'ятьох місцях. Один `Find(Predicate<Expense>)` замінює їх усі.

**Сортувати список, який тобі передали.** Метод, який мовчки змінює аргумент,
рано чи пізно зіпсує дані в тому місці, де цього ніхто не чекав. Сортуйте
копію.
