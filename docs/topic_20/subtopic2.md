---
sidebar_position: 3
---

# Реалізація: збереження у файл та меню

Модель і сервіс готові й перевірені. Залишилося два шари: нижній — сховище,
яке кладе дані на диск, і верхній — інтерфейс, який розмовляє з людиною.
Наприкінці підрозділу у нас буде повністю робоча програма.

## Крок 5. Обираємо формат: CSV чи JSON

Перше рішення — у якому вигляді лежатимуть дані у файлі. Два розумні варіанти.

**CSV** (Comma-Separated Values) — текстовий файл, де кожен рядок є записом,
а поля розділені символом-роздільником:

```
Id;Date;Amount;Category;Note
1;2025-11-03;245.50;1;Продукти на тиждень
2;2025-11-05;32.00;2;Метро
```

**JSON** (JavaScript Object Notation) — текстовий формат із вкладеними
структурами:

```json
[
  {
    "Id": 1,
    "Date": "2025-11-03",
    "Amount": 245.50,
    "Category": "Food",
    "Note": "Продукти на тиждень"
  }
]
```

| | CSV | JSON |
|---|---|---|
| Розмір файлу | компактний | у 3–5 разів більший |
| Читається людиною | так, і відкривається в Excel | так, але багатослівно |
| Вкладені дані (список у списку) | не вміє | вміє |
| Код серіалізації | пишемо руками, 60–80 рядків | один рядок через `System.Text.Json` |
| Помилка в одному рядку | псує лише цей рядок | псує весь файл |
| Спецсимволи в тексті | треба екранувати самому | бібліотека робить сама |

Компроміс такий: **CSV дешевший у зберіганні й дорожчий у коді, JSON навпаки**.

У цьому проєкті ми напишемо **обидва** сховища. CSV — як основне, бо на ньому
видно, як влаштована серіалізація зсередини (а це і є навчальна мета). JSON —
як другу реалізацію того самого інтерфейсу, щоб на практиці побачити,
навіщо цей інтерфейс узагалі був потрібен.

:::info Цікаво
XML, який ви могли бачити у файлах `.csproj`, — це третій популярний варіант.
Він потужніший за JSON, але значно багатослівніший, і в нових проєктах його
майже витіснив JSON. Формат `.csproj` залишається XML передусім з історичних
причин.
:::

## Крок 6. Власний тип винятку

Перш ніж писати сховище, домовимося про те, як воно повідомлятиме про біду.

Проблема: сховище може кинути `IOException`, `UnauthorizedAccessException`,
`FormatException`, `JsonException` — і всі вони приїдуть у меню. Змушувати
`MenuApp` знати про десять типів винятків із різних бібліотек — це знову
змішування шарів.

Рішення: сховище **ловить чужі винятки і кидає свій**, зрозумілий верхньому
шару.

```csharp
// файл Storage/StorageException.cs
namespace ExpenseTracker.Storage;

/// <summary>Будь-яка біда зі сховищем, описана людською мовою.</summary>
public class StorageException : Exception
{
    public StorageException(string message) : base(message)
    {
    }

    public StorageException(string message, Exception inner) : base(message, inner)
    {
    }
}
```

Другий конструктор із параметром `inner` — важливий. Він зберігає **початковий**
виняток усередині нашого. Користувачеві ми покажемо зрозуміле повідомлення,
а під час відлагодження зможемо подивитися `ex.InnerException` і побачити
справжню технічну причину. Втрачати її не можна.

:::tip Порада
Правило поводження з винятками між шарами: **перехоплюй низькорівневий,
кидай високорівневий, зберігай початковий у `InnerException`**. Так UI ловить
один тип, а інформація не губиться.
:::

## Крок 7. Сховище CSV

Найдовший клас проєкту. Розберемо його частинами, а потім наведемо цілком.

### Чому `Split(';')` недостатньо

Спокуслива ідея: `line.Split(';')` — і готово. Вона працює рівно доти, доки
користувач не введе нотатку «Кава; тістечко». Тоді в рядку стане шість полів
замість п'яти, і запис розсиплеться.

Стандартне розв'язання (його використовує і Excel): якщо поле містить
роздільник або лапки, поле беруть у подвійні лапки, а лапки всередині
подвоюють.

```
без екранування:  Кава і тістечко
з роздільником:   "Кава; тістечко"
з лапками:        "Він сказав ""дякую"""
```

Розбирати такий рядок доводиться символ за символом. Це двадцять рядків коду —
і чудова нагода зрозуміти, чому серйозні формати не парсять через `Split`.

### Чому `CultureInfo.InvariantCulture` обов'язкова

Це найпідступніша помилка в усій темі.

```csharp
decimal amount = 245.5m;
Console.WriteLine(amount.ToString());  // на укр. Windows: 245,5
                                       // на англ. Windows: 245.5
```

Якщо записати у файл `245,5`, а роздільник полів — крапка з комою, файл
зіпсується. Ще гірше: файл, збережений на комп'ютері з українськими
налаштуваннями, не прочитається на комп'ютері з англійськими, і навпаки.

**Правило: для формату обміну даними завжди `CultureInfo.InvariantCulture`.**
Це фіксована «нейтральна» культура: крапка як десятковий роздільник, ніяких
розділювачів тисяч, дати за ISO. Для показу людині — навпаки, культура
користувача.

| Куди йде число | Культура | Приклад |
|---|---|---|
| у файл, у мережу, у БД | `InvariantCulture` | `245.50`, `2025-11-03` |
| на екран користувачеві | поточна культура | `245,50 грн`, `03.11.2025` |

:::danger Часта помилка
`decimal.Parse(text)` без указання культури використовує **поточну** культуру
комп'ютера. Програма працює у вас і падає у викладача. Завжди вказуйте
культуру явно там, де читаєте або пишете дані у файл.
:::

### Повний код сховища

```csharp
// файл Storage/CsvExpenseStorage.cs
using System.Globalization;
using System.Text;
using ExpenseTracker.Models;

namespace ExpenseTracker.Storage;

/// <summary>Зберігає витрати у текстовому CSV-файлі.</summary>
public class CsvExpenseStorage : IExpenseStorage
{
    private const char Separator = ';';
    private const string Header = "Id;Date;Amount;Category;Note";
    private const string DateFormat = "yyyy-MM-dd";

    private readonly string filePath;

    public CsvExpenseStorage(string filePath)
    {
        this.filePath = filePath;
    }

    public string Description => $"файл {Path.GetFullPath(filePath)}";

    // ---------- читання ----------

    public List<Expense> Load()
    {
        var result = new List<Expense>();

        // Немає файлу — це не помилка, а перший запуск програми.
        if (!File.Exists(filePath))
        {
            return result;
        }

        string[] lines;
        try
        {
            lines = File.ReadAllLines(filePath, Encoding.UTF8);
        }
        catch (IOException ex)
        {
            throw new StorageException(
                $"Не вдалося прочитати файл даних. Можливо, він відкритий " +
                $"в іншій програмі. Подробиці: {ex.Message}", ex);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new StorageException(
                $"Немає прав на читання файлу даних: {ex.Message}", ex);
        }

        for (int i = 0; i < lines.Length; i++)
        {
            string line = lines[i];

            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }
            if (i == 0 && line.StartsWith("Id" + Separator))
            {
                continue;   // рядок заголовка
            }

            result.Add(ParseLine(line, i + 1));
        }

        return result;
    }

    private static Expense ParseLine(string line, int lineNumber)
    {
        var fields = SplitCsvLine(line);

        if (fields.Count != 5)
        {
            throw new StorageException(
                $"Рядок {lineNumber}: очікувалося 5 полів, знайдено {fields.Count}.");
        }

        if (!int.TryParse(fields[0], NumberStyles.Integer,
                          CultureInfo.InvariantCulture, out int id))
        {
            throw new StorageException(
                $"Рядок {lineNumber}: номер «{fields[0]}» не є цілим числом.");
        }

        if (!DateOnly.TryParseExact(fields[1], DateFormat, CultureInfo.InvariantCulture,
                                    DateTimeStyles.None, out DateOnly date))
        {
            throw new StorageException(
                $"Рядок {lineNumber}: дата «{fields[1]}» не у форматі {DateFormat}.");
        }

        if (!decimal.TryParse(fields[2], NumberStyles.Number,
                              CultureInfo.InvariantCulture, out decimal amount))
        {
            throw new StorageException(
                $"Рядок {lineNumber}: сума «{fields[2]}» не є числом.");
        }

        if (!int.TryParse(fields[3], NumberStyles.Integer,
                          CultureInfo.InvariantCulture, out int categoryCode)
            || !Enum.IsDefined((ExpenseCategory)categoryCode))
        {
            throw new StorageException(
                $"Рядок {lineNumber}: невідома категорія «{fields[3]}».");
        }

        try
        {
            return new Expense(date, amount, (ExpenseCategory)categoryCode, fields[4])
            {
                Id = id
            };
        }
        catch (ArgumentException ex)
        {
            // Дані у файлі формально розібралися, але не пройшли валідацію моделі.
            throw new StorageException($"Рядок {lineNumber}: {ex.Message}", ex);
        }
    }

    /// <summary>Розбиває CSV-рядок на поля з урахуванням лапок.</summary>
    private static List<string> SplitCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];

            if (inQuotes)
            {
                if (c != '"')
                {
                    current.Append(c);
                }
                else if (i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');   // подвоєні лапки — це одні лапки
                    i++;
                }
                else
                {
                    inQuotes = false;      // закриваюча лапка
                }
            }
            else
            {
                if (c == '"' && current.Length == 0)
                {
                    inQuotes = true;       // поле починається з лапки
                }
                else if (c == Separator)
                {
                    fields.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }
        }

        fields.Add(current.ToString());
        return fields;
    }

    // ---------- запис ----------

    public void Save(IReadOnlyList<Expense> expenses)
    {
        var lines = new List<string> { Header };
        foreach (var expense in expenses)
        {
            lines.Add(ToLine(expense));
        }

        try
        {
            // Пишемо спочатку в тимчасовий файл, і лише потім підміняємо основний.
            // Якщо світло згасне посеред запису, старі дані вціліють.
            string tempPath = filePath + ".tmp";
            File.WriteAllLines(tempPath, lines, Encoding.UTF8);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
            File.Move(tempPath, filePath);
        }
        catch (IOException ex)
        {
            throw new StorageException(
                $"Не вдалося зберегти дані. Можливо, файл відкритий в іншій " +
                $"програмі. Подробиці: {ex.Message}", ex);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new StorageException(
                $"Немає прав на запис файлу даних: {ex.Message}", ex);
        }
    }

    private static string ToLine(Expense expense) => string.Join(Separator,
        expense.Id.ToString(CultureInfo.InvariantCulture),
        expense.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
        expense.Amount.ToString(CultureInfo.InvariantCulture),
        ((int)expense.Category).ToString(CultureInfo.InvariantCulture),
        Escape(expense.Note));

    /// <summary>Бере поле в лапки, якщо в ньому є роздільник або лапки.</summary>
    private static string Escape(string value)
    {
        if (!value.Contains(Separator) && !value.Contains('"'))
        {
            return value;
        }
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
```

### Що тут важливо

**`File.Exists` замість `try`/`catch` на першому запуску.** Відсутність файлу —
не виняткова ситуація, а нормальний стан програми, яку запустили вперше.
Винятки для нормальних станів — марна витрата і плутанина в коді.

**Категорія зберігається числом, а не назвою.** У файлі стоїть `1`, а не `Food`
і не «Їжа». Причина: якщо колись перейменувати `Food` на `Groceries`, старі
файли залишаться читабельними. Саме тому ми й задали числа в `enum` явно.

**Дата у форматі `yyyy-MM-dd`.** Це ISO 8601, міжнародний стандарт.
Його головна перевага: такі рядки **сортуються як текст у правильному
хронологічному порядку**. Формат `dd.MM.yyyy` цією властивістю не володіє.

**Метод `TryParse` замість `Parse`.** `Parse` кидає виняток, `TryParse` повертає
`bool` і не витрачає ресурси на створення винятку. Читаючи чужий файл, ми
очікуємо, що там може бути будь-що, — це нормальний хід подій, а не аварія.

**Запис через тимчасовий файл.** `File.WriteAllLines` спочатку **обрізає** файл
до нуля, а потім пише. Якщо програма впаде посередині, у користувача
залишиться половина даних або порожній файл. Запис у `.tmp` із подальшим
перейменуванням робить операцію майже атомарною.

**Зіпсований рядок зупиняє завантаження.** Можна було б мовчки пропускати
некоректні рядки. Ми свідомо обрали інше.

| Стратегія | Плюс | Мінус |
|---|---|---|
| пропустити зіпсований рядок | програма завжди стартує | користувач тихо втрачає дані |
| впасти з докладним повідомленням | видно, що саме зламалося | треба лізти у файл руками |

Для грошей другий варіант чесніший: краще сказати «рядок 7 зіпсовано»,
ніж мовчки з'їсти витрату на 3000 грн. Повідомлення обов'язково містить
**номер рядка** — інакше порада «полагодьте файл» некорисна.

## Крок 8. Друга реалізація: JSON

Тепер найцікавіше. Другий клас, який робить ту саму роботу зовсім інакше.

```csharp
// файл Storage/JsonExpenseStorage.cs
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ExpenseTracker.Models;

namespace ExpenseTracker.Storage;

/// <summary>Зберігає витрати у JSON-файлі засобами System.Text.Json.</summary>
public class JsonExpenseStorage : IExpenseStorage
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly string filePath;

    public JsonExpenseStorage(string filePath)
    {
        this.filePath = filePath;
    }

    public string Description => $"файл {Path.GetFullPath(filePath)}";

    public List<Expense> Load()
    {
        if (!File.Exists(filePath))
        {
            return [];
        }

        try
        {
            string json = File.ReadAllText(filePath, Encoding.UTF8);
            if (string.IsNullOrWhiteSpace(json))
            {
                return [];
            }
            return JsonSerializer.Deserialize<List<Expense>>(json, Options) ?? [];
        }
        catch (JsonException ex)
        {
            throw new StorageException($"Файл даних пошкоджено: {ex.Message}", ex);
        }
        catch (ArgumentException ex)
        {
            throw new StorageException($"Некоректні дані у файлі: {ex.Message}", ex);
        }
        catch (IOException ex)
        {
            throw new StorageException($"Не вдалося прочитати файл: {ex.Message}", ex);
        }
    }

    public void Save(IReadOnlyList<Expense> expenses)
    {
        try
        {
            string json = JsonSerializer.Serialize(expenses, Options);
            File.WriteAllText(filePath, json, Encoding.UTF8);
        }
        catch (IOException ex)
        {
            throw new StorageException($"Не вдалося зберегти дані: {ex.Message}", ex);
        }
    }
}
```

Двісті сорок рядків CSV перетворилися на сімдесят. Уся серіалізація — це
`JsonSerializer.Serialize` і `JsonSerializer.Deserialize`.

**`WriteIndented = true`** робить файл читабельним для людини (з відступами).
У бойових системах його вимикають, щоб економити місце.

**`JsonStringEnumConverter`** пише категорію словом `"Food"` замість числа `1`.
Файл стає зрозумілішим, але з'являється той самий ризик: перейменували
елемент `enum` — старі файли не читаються. Компроміс на ваш вибір.

**Як бібліотека створює `Expense`, якщо в нього немає конструктора без
параметрів?** `System.Text.Json` бачить, що публічний конструктор один,
і зіставляє його параметри з іменами полів JSON без урахування регістру:
`date` з `"Date"`, `amount` з `"Amount"` і так далі. Решту властивостей
(у нас це `Id`) вона присвоює вже після виклику конструктора. Валідація
у сеттерах при цьому працює — зіпсовані дані у файлі спричинять
`ArgumentException`, який ми перехоплюємо.

Тепер обіцяна нагорода за інтерфейс. Щоб перевести весь застосунок на JSON,
треба змінити **один рядок** у `Program.cs`:

```csharp
// було
IExpenseStorage storage = new CsvExpenseStorage("expenses.csv");

// стало
IExpenseStorage storage = new JsonExpenseStorage("expenses.json");
```

Ані `ExpenseService`, ані `MenuApp`, ані `Expense` не змінюються взагалі.
Ось заради чого був потрібен інтерфейс.

## Крок 9. Валідація введення: `InputHelper`

Найчастіша причина падіння студентських програм — це рядок

```csharp
int n = int.Parse(Console.ReadLine());   // так робити не можна
```

Тут дві бомби: користувач може ввести «привіт» (буде `FormatException`)
або натиснути Ctrl+Z (буде `null` і `ArgumentNullException`). Плюс третя,
логічна: навіть коректне число може бути безглуздим — місяць 47, наприклад.

Правильна поведінка консольної програми: **не падати, а перепитати**.
Ця логіка однакова для всіх полів, тож виносимо її в окремий клас.

```csharp
// файл UI/InputHelper.cs
using System.Globalization;
using ExpenseTracker.Models;

namespace ExpenseTracker.UI;

/// <summary>Безпечне читання значень із клавіатури: питає, доки не отримає коректне.</summary>
public static class InputHelper
{
    /// <summary>Console.ReadLine може повернути null (Ctrl+Z). Ніколи не забуваємо про це.</summary>
    private static string ReadLineSafe() => Console.ReadLine() ?? string.Empty;

    public static string ReadText(string prompt, bool allowEmpty = false)
    {
        while (true)
        {
            Console.Write(prompt);
            string input = ReadLineSafe().Trim();

            if (allowEmpty || input.Length > 0)
            {
                return input;
            }
            Console.WriteLine("  Порожнє значення не приймається.");
        }
    }

    public static int ReadInt(string prompt, int min, int max)
    {
        while (true)
        {
            Console.Write(prompt);
            string input = ReadLineSafe().Trim();

            if (!int.TryParse(input, out int value))
            {
                Console.WriteLine("  Потрібно ввести ціле число.");
                continue;
            }
            if (value < min || value > max)
            {
                Console.WriteLine($"  Число має бути від {min} до {max}.");
                continue;
            }
            return value;
        }
    }

    public static decimal ReadDecimal(string prompt, decimal min, decimal max)
    {
        while (true)
        {
            Console.Write(prompt);

            // Приймаємо і кому, і крапку — людині так зручніше.
            string input = ReadLineSafe().Trim().Replace(',', '.');

            if (!decimal.TryParse(input, NumberStyles.Number,
                                  CultureInfo.InvariantCulture, out decimal value))
            {
                Console.WriteLine("  Це не схоже на число. Приклад: 245,50");
                continue;
            }
            if (value < min || value > max)
            {
                Console.WriteLine($"  Сума має бути від {min:N2} до {max:N2}.");
                continue;
            }
            return value;
        }
    }

    /// <summary>Читає дату у форматі дд.мм.рррр. Порожній рядок означає «сьогодні».</summary>
    public static DateOnly ReadDate(string prompt)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        while (true)
        {
            Console.Write(prompt);
            string input = ReadLineSafe().Trim();

            if (input.Length == 0)
            {
                return today;
            }

            if (!DateOnly.TryParseExact(input, "dd.MM.yyyy", CultureInfo.InvariantCulture,
                                        DateTimeStyles.None, out DateOnly date))
            {
                Console.WriteLine("  Формат дати: дд.мм.рррр, наприклад 03.11.2025");
                continue;
            }
            if (date > today)
            {
                Console.WriteLine("  Дата не може бути в майбутньому.");
                continue;
            }
            return date;
        }
    }

    public static ExpenseCategory ReadCategory()
    {
        var all = CategoryNames.All();

        foreach (var category in all)
        {
            Console.WriteLine($"    {(int)category}. {CategoryNames.Get(category)}");
        }

        int choice = ReadInt("  Категорія: ", 1, all.Length);
        return all[choice - 1];
    }

    public static bool Confirm(string question)
    {
        while (true)
        {
            Console.Write($"{question} (т/н): ");
            string answer = ReadLineSafe().Trim().ToLowerInvariant();

            if (answer is "т" or "так" or "y" or "yes")
            {
                return true;
            }
            if (answer is "н" or "ні" or "n" or "no")
            {
                return false;
            }
            Console.WriteLine("  Введіть «т» або «н».");
        }
    }
}
```

### Що тут важливо

**Цикл `while (true)` із `return` усередині.** Класичний шаблон «питай, доки
не отримаєш нормальне». Виходимо з циклу лише через `return` — тобто лише
з коректним значенням. Тому виклик `InputHelper.ReadDecimal(...)` **гарантовано**
повертає число в межах, і викликач може про перевірки більше не думати.

**Межі передаються параметрами.** Той самий `ReadInt` обслуговує і вибір
пункту меню (0–6), і місяць (1–12), і номер запису. Один метод замість трьох.

**`Replace(',', '.')` перед розбором.** Людина в Україні напише «245,50».
Ми замінюємо кому на крапку й розбираємо за `InvariantCulture` — приймаються
обидва варіанти написання. Дрібниця, яка знімає купу роздратування.

**Порожній рядок як «сьогодні».** Більшість витрат вносять того ж дня.
Змушувати щоразу друкувати дату — неповага до користувача.

**`answer is "т" or "так"`** — це **зіставлення зі зразком** (pattern matching).
Читається як речення й коротше за ланцюжок `answer == "т" || answer == "так"`.

:::warning Обережно
`Console.ReadLine()` повертає `string?` — тип, що допускає `null`. У .NET 8
із увімкненими nullable reference types компілятор попередить вас жовтим
підкресленням. Не ігноруйте попередження і не глушіть його знаком `!`;
використайте `?? string.Empty`, як у `ReadLineSafe`.
:::

## Крок 10. Головне меню

Останній клас. Він великий, але кожен його метод крихітний — це і є головний
прийом боротьби з розміром.

```csharp
// файл UI/MenuApp.cs
using ExpenseTracker.Models;
using ExpenseTracker.Services;
using ExpenseTracker.Storage;

namespace ExpenseTracker.UI;

/// <summary>Головний цикл застосунку: меню, екрани, форматування.</summary>
public class MenuApp
{
    private const string Divider =
        "──────────────────────────────────────────────────────────";

    private readonly ExpenseService service;
    private bool running = true;
    private bool hasUnsavedChanges;

    public MenuApp(ExpenseService service)
    {
        this.service = service;
    }

    public void Run()
    {
        LoadData();

        while (running)
        {
            ShowMenu();
            int choice = InputHelper.ReadInt("Ваш вибір: ", 0, 6);
            Console.WriteLine();
            Execute(choice);
            Console.WriteLine();
        }
    }

    // ---------- інфраструктура ----------

    private void LoadData()
    {
        try
        {
            service.Load();
            Console.WriteLine($"Дані завантажено. Записів: {service.Count}");
        }
        catch (StorageException ex)
        {
            Console.WriteLine("Не вдалося завантажити дані:");
            Console.WriteLine($"  {ex.Message}");
            Console.WriteLine("Програма продовжить роботу з порожнім списком.");
            Console.WriteLine("УВАГА: збереження перезапише файл. Зробіть копію, якщо дані цінні.");
        }
    }

    private void ShowMenu()
    {
        Console.WriteLine(Divider);
        Console.WriteLine("  ТРЕКЕР ВИТРАТ");
        Console.WriteLine(Divider);
        Console.WriteLine($"  Записів: {service.Count}{(hasUnsavedChanges ? "   * є незбережені зміни" : "")}");
        Console.WriteLine($"  Сховище: {service.StorageDescription}");
        Console.WriteLine(Divider);
        Console.WriteLine("  1. Додати витрату");
        Console.WriteLine("  2. Показати всі витрати");
        Console.WriteLine("  3. Витрати за категорією");
        Console.WriteLine("  4. Звіт за місяць");
        Console.WriteLine("  5. Видалити витрату");
        Console.WriteLine("  6. Зберегти");
        Console.WriteLine("  0. Вихід");
        Console.WriteLine(Divider);
    }

    private void Execute(int choice)
    {
        switch (choice)
        {
            case 1: AddExpense(); break;
            case 2: ShowAll(); break;
            case 3: ShowByCategory(); break;
            case 4: ShowMonthReport(); break;
            case 5: DeleteExpense(); break;
            case 6: SaveData(); break;
            case 0: Exit(); break;
        }
    }

    // ---------- екрани ----------

    private void AddExpense()
    {
        Console.WriteLine("--- НОВА ВИТРАТА ---");

        var date = InputHelper.ReadDate("  Дата (дд.мм.рррр, Enter = сьогодні): ");
        decimal amount = InputHelper.ReadDecimal("  Сума, грн: ",
                                                 Expense.MinAmount, Expense.MaxAmount);
        var category = InputHelper.ReadCategory();
        string note = InputHelper.ReadText("  Нотатка: ", allowEmpty: true);

        var added = service.Add(date, amount, category, note);
        hasUnsavedChanges = true;

        Console.WriteLine($"Додано: {added}");
    }

    private void ShowAll()
    {
        Console.WriteLine("--- УСІ ВИТРАТИ ---");
        PrintList(service.All());
    }

    private void ShowByCategory()
    {
        Console.WriteLine("--- ВИТРАТИ ЗА КАТЕГОРІЄЮ ---");
        var category = InputHelper.ReadCategory();
        Console.WriteLine();
        Console.WriteLine($"Категорія: {CategoryNames.Get(category)}");
        PrintList(service.ByCategory(category));
    }

    private void DeleteExpense()
    {
        Console.WriteLine("--- ВИДАЛЕННЯ ---");

        if (service.Count == 0)
        {
            Console.WriteLine("Видаляти нічого — список порожній.");
            return;
        }

        PrintList(service.All());
        int id = InputHelper.ReadInt("Номер запису для видалення (0 — скасувати): ", 0, int.MaxValue);

        if (id == 0)
        {
            Console.WriteLine("Скасовано.");
            return;
        }

        if (service.Remove(id))
        {
            hasUnsavedChanges = true;
            Console.WriteLine($"Запис #{id} видалено.");
        }
        else
        {
            Console.WriteLine($"Запису з номером {id} не знайдено.");
        }
    }

    private void ShowMonthReport()
    {
        Console.WriteLine("--- ЗВІТ ЗА МІСЯЦЬ ---");

        int year = InputHelper.ReadInt("  Рік: ", 2000, DateTime.Today.Year);
        int month = InputHelper.ReadInt("  Місяць (1-12): ", 1, 12);

        var items = service.ForMonth(year, month);
        Console.WriteLine();
        Console.WriteLine($"Звіт за {month:D2}.{year}");
        Console.WriteLine(Divider);

        if (items.Count == 0)
        {
            Console.WriteLine("За цей місяць витрат немає.");
            return;
        }

        decimal total = ExpenseService.Total(items);
        Console.WriteLine($"Кількість витрат:   {items.Count}");
        Console.WriteLine($"Загальна сума:      {total:N2} грн");
        Console.WriteLine($"У середньому/день:  {ExpenseService.AveragePerDay(items, year, month):N2} грн");

        var largest = ExpenseService.Largest(items);
        if (largest is not null)
        {
            Console.WriteLine($"Найбільша витрата:  {largest.Amount:N2} грн — {largest.Note}");
        }

        Console.WriteLine();
        Console.WriteLine("Розподіл за категоріями:");
        PrintCategoryChart(ExpenseService.TotalsByCategory(items), total);
    }

    private void SaveData()
    {
        try
        {
            service.Save();
            hasUnsavedChanges = false;
            Console.WriteLine($"Збережено записів: {service.Count}");
        }
        catch (StorageException ex)
        {
            Console.WriteLine("Помилка збереження:");
            Console.WriteLine($"  {ex.Message}");
            Console.WriteLine("Дані залишилися в пам'яті. Спробуйте зберегти ще раз.");
        }
    }

    private void Exit()
    {
        if (hasUnsavedChanges && InputHelper.Confirm("Є незбережені зміни. Зберегти?"))
        {
            SaveData();
            if (hasUnsavedChanges)   // збереження не вдалося
            {
                if (!InputHelper.Confirm("Вийти без збереження?"))
                {
                    return;
                }
            }
        }

        running = false;
        Console.WriteLine("До зустрічі!");
    }

    // ---------- форматування ----------

    private static void PrintList(List<Expense> items)
    {
        if (items.Count == 0)
        {
            Console.WriteLine("Записів немає.");
            return;
        }

        Console.WriteLine(Divider);
        foreach (var expense in ExpenseService.SortedByDate(items))
        {
            Console.WriteLine(expense);
        }
        Console.WriteLine(Divider);
        Console.WriteLine($"Разом: {ExpenseService.Total(items),10:N2} грн ({items.Count} шт.)");
    }

    private static void PrintCategoryChart(
        Dictionary<ExpenseCategory, decimal> totals, decimal total)
    {
        // Ідемо по CategoryNames.All(), щоб порядок рядків завжди був однаковий:
        // порядок ключів у Dictionary не гарантований.
        foreach (var category in CategoryNames.All())
        {
            if (!totals.TryGetValue(category, out decimal sum))
            {
                continue;
            }

            double percent = (double)(sum / total) * 100;
            string bar = new string('#', (int)Math.Round(percent / 5));

            Console.WriteLine(
                $"  {CategoryNames.Get(category),-12} {sum,10:N2} грн  {percent,5:F1}%  {bar}");
        }
    }
}
```

### Що тут важливо

**Жодного `Console.ReadLine` напряму.** Усе введення йде через `InputHelper`.
Тому в `MenuApp` немає жодного `try`/`catch` навколо розбору чисел — цю роботу
вже зроблено нижче.

**Кожен пункт меню — окремий метод.** `Execute` складається з семи однорядкових
`case`. Один погляд — і зрозуміло, що вміє програма. Якби тіла екранів були
всередині `switch`, метод розтягнувся б на двісті рядків, і його довелося б
гортати.

**Прапорець `hasUnsavedChanges`.** Це маленька, але важлива турбота про
користувача: програма не дасть мовчки втратити пів години роботи. Ставиться
в `AddExpense` і `DeleteExpense`, знімається в `SaveData`.

**`try`/`catch` тільки у двох місцях** — там, де викликається сховище
(`LoadData` і `SaveData`). Це і є та сама межа: нижче кидають, тут ловлять
і розмовляють із людиною.

**Порядок рядків у звіті.** `Dictionary` не гарантує порядок обходу, тому
таблиця категорій «стрибала б» від запуску до запуску. Ми обходимо
`CategoryNames.All()` і беремо з словника лише наявні ключі — порядок стає
сталим. Це саме той дрібний баг, який студенти помічають найпізніше.

**`TryGetValue` замість `ContainsKey` плюс індексатор.** Один пошук у словнику
замість двох, і код коротший.

:::tip Порада
`(int)Math.Round(percent / 5)` дає довжину смужки: 100 % — це 20 символів.
Такий «графік із решіток» коштує один рядок коду і робить консольний звіт
у рази наочнішим. Викладачі це помічають.
:::

## Крок 11. `Program.cs`

Тепер найкоротший файл у проєкті. Його єдина робота — **скласти застосунок
із деталей**.

```csharp
// файл Program.cs
using System.Globalization;
using ExpenseTracker.Services;
using ExpenseTracker.Storage;
using ExpenseTracker.UI;

// Українські літери в консолі Windows.
Console.OutputEncoding = System.Text.Encoding.UTF8;

// Формат чисел і дат для показу користувачеві.
CultureInfo.CurrentCulture = new CultureInfo("uk-UA");

// Складання застосунку: одне місце, де обираються конкретні реалізації.
IExpenseStorage storage = new CsvExpenseStorage("expenses.csv");
var service = new ExpenseService(storage);
var app = new MenuApp(service);

app.Run();
```

Одинадцять рядків із коментарями. Це **точка складання** (composition root) —
єдине місце в програмі, яке знає про всі шари одночасно. Саме тому заміна
CSV на JSON коштує один рядок.

Зверніть увагу на тип змінної: `IExpenseStorage storage`, а не
`var storage`. З `var` тип був би `CsvExpenseStorage`, і код нижче міг би
випадково скористатися чимось специфічним для CSV. Явний тип-інтерфейс —
це нагадування собі: працюємо тільки з контрактом.

:::note
Файл `expenses.csv` створиться поруч із виконуваним файлом програми —
десь у `bin\Debug\net8.0\`. Щоб знайти його, скористайтеся тим, що виводить
меню в рядку «Сховище»: там повний шлях завдяки `Path.GetFullPath`.
:::

## Приклад сесії

Ось як виглядає робота з програмою від першого запуску. Введення користувача
показано після символів запрошення.

```
Дані завантажено. Записів: 0
──────────────────────────────────────────────────────────
  ТРЕКЕР ВИТРАТ
──────────────────────────────────────────────────────────
  Записів: 0
  Сховище: файл C:\Projects\ExpenseTracker\bin\Debug\net8.0\expenses.csv
──────────────────────────────────────────────────────────
  1. Додати витрату
  2. Показати всі витрати
  3. Витрати за категорією
  4. Звіт за місяць
  5. Видалити витрату
  6. Зберегти
  0. Вихід
──────────────────────────────────────────────────────────
Ваш вибір: 1

--- НОВА ВИТРАТА ---
  Дата (дд.мм.рррр, Enter = сьогодні):
  Сума, грн: сто
  Це не схоже на число. Приклад: 245,50
  Сума, грн: -50
  Сума має бути від 0,01 до 1 000 000,00.
  Сума, грн: 245,50
    1. Їжа
    2. Транспорт
    3. Житло
    4. Розваги
    5. Здоров'я
    6. Навчання
    7. Інше
  Категорія: 1
  Нотатка: Продукти на тиждень
Додано: #1    22.11.2025      245,50 грн  Їжа          Продукти на тиждень
```

Далі користувач додає ще дві витрати (виведення меню пропущено для стислості):

```
Ваш вибір: 1

--- НОВА ВИТРАТА ---
  Дата (дд.мм.рррр, Enter = сьогодні): 20.11.2025
  Сума, грн: 32
    1. Їжа
    ...
  Категорія: 2
  Нотатка: Метро
Додано: #2    20.11.2025       32,00 грн  Транспорт    Метро

Ваш вибір: 1

--- НОВА ВИТРАТА ---
  Дата (дд.мм.рррр, Enter = сьогодні): 18.11.2025
  Сума, грн: 1800
    1. Їжа
    ...
  Категорія: 3
  Нотатка: Комуналка за жовтень
Додано: #3    18.11.2025    1 800,00 грн  Житло        Комуналка за жовтень
```

Дивимось список і звіт:

```
Ваш вибір: 2

--- УСІ ВИТРАТИ ---
──────────────────────────────────────────────────────────
#3    18.11.2025    1 800,00 грн  Житло        Комуналка за жовтень
#2    20.11.2025       32,00 грн  Транспорт    Метро
#1    22.11.2025      245,50 грн  Їжа          Продукти на тиждень
──────────────────────────────────────────────────────────
Разом:   2 077,50 грн (3 шт.)

Ваш вибір: 4

--- ЗВІТ ЗА МІСЯЦЬ ---
  Рік: 2025
  Місяць (1-12): 11

Звіт за 11.2025
──────────────────────────────────────────────────────────
Кількість витрат:   3
Загальна сума:      2 077,50 грн
У середньому/день:  94,43 грн
Найбільша витрата:  1 800,00 грн — Комуналка за жовтень

Розподіл за категоріями:
  Їжа              245,50 грн   11,8%  ##
  Транспорт         32,00 грн    1,5%
  Житло          1 800,00 грн   86,6%  #################
```

Видаляємо помилковий запис і зберігаємо:

```
Ваш вибір: 5

--- ВИДАЛЕННЯ ---
──────────────────────────────────────────────────────────
#3    18.11.2025    1 800,00 грн  Житло        Комуналка за жовтень
#2    20.11.2025       32,00 грн  Транспорт    Метро
#1    22.11.2025      245,50 грн  Їжа          Продукти на тиждень
──────────────────────────────────────────────────────────
Разом:   2 077,50 грн (3 шт.)
Номер запису для видалення (0 — скасувати): 2
Запис #2 видалено.

Ваш вибір: 0

До зустрічі!
```

Стоп — а де питання про збереження? Уважний читач помітив: у прикладі вище
користувач вибрав `0`, маючи незбережені зміни. Насправді програма запитає:

```
Ваш вибір: 0

Є незбережені зміни. Зберегти? (т/н): т
Збережено записів: 2
До зустрічі!
```

Файл `expenses.csv` після цього містить:

```
Id;Date;Amount;Category;Note
1;2025-11-22;245.50;1;Продукти на тиждень
3;2025-11-18;1800;3;Комуналка за жовтень
```

Зверніть увагу на три речі. По-перше, номери не перенумеровано: був `#2` —
його немає, `#3` залишився `#3`. По-друге, суми записані з **крапкою**,
а на екрані показувалися з комою — саме це і робить `InvariantCulture`.
По-третє, `1800` записано без копійок, бо користувач ввів ціле число:
для `decimal` це нормально, при читанні вийде та сама сума.

При наступному запуску:

```
Дані завантажено. Записів: 2
```

Готово. Застосунок працює, дані переживають перезапуск, некоректне введення
не ламає програму.

## Типові помилки

**`int.Parse(Console.ReadLine())`.** Найшвидший спосіб уронити програму. Завжди
`TryParse` у циклі — або, ще краще, готовий метод `InputHelper`.

**Забути `CultureInfo.InvariantCulture` при записі у файл.** Програма працює
на вашому комп'ютері й не працює на комп'ютері викладача. Найкоштовніша
помилка на захисті.

**Розбирати CSV через `Split(';')` без урахування лапок.** Працює, доки хтось
не введе крапку з комою в нотатці. Або пишіть повноцінний розбір, або явно
забороняйте роздільник у полі введення.

**Ловити `Exception` замість конкретного типу.** `catch (Exception)` ховає
і помилки файлу, і ваші власні `NullReferenceException`. Ловіть те, що вмієте
обробити; решта нехай падає голосно — так ви про них дізнаєтеся.

**Виводити повідомлення `ex.ToString()` користувачеві.** Стек викликів на
тридцять рядків не допоможе людині, яка просто хотіла записати витрату.
Користувачеві — `ex.Message` і порада, що робити; повний текст — у журнал
або в режим відлагодження.

**Забути зберегти перед виходом.** Класика: користувач працював годину,
натиснув `0`, дані зникли. Прапорець «є незбережені зміни» і питання при
виході коштують п'ять рядків коду.
