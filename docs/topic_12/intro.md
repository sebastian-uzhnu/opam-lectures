---
sidebar_position: 1
---

# Файлова система та простір імен System.IO

## Програма без пам'яті

Усі програми, які ви писали досі, мали одну спільну ваду: вони забували все.
Ви вводили десять оцінок, програма рахувала середнє, ви закривали вікно —
і оцінок більше немає. Наступного разу вводити знову.

Причина проста: змінні, масиви й колекції живуть в **оперативній пам'яті**,
а вона очищується разом із процесом. Щоб дані пережили закриття програми,
їх треба записати туди, де вони збережуться — на **диск**, у файл.

**Файл** — це іменований набір байтів, який зберігається на носії інформації.
Все, що є на вашому комп'ютері, — файли: фото, музика, текст лекції, сама
програма Visual Studio.

З цієї теми ваші програми починають запам'ятовувати.

## Простір імен System.IO

Усе, що стосується файлів і папок у .NET, зібрано в просторі імен
**`System.IO`** (IO — від *Input/Output*, введення-виведення).

```csharp
using System.IO;   // у .NET 8 підключається автоматично (implicit usings)
```

У новому консольному проєкті .NET 8 цей рядок писати не треба: працює
механізм *implicit usings*, який підключає найуживаніші простори імен сам.
Якщо ви бачите старий код, де цей рядок є, — він не зайвий, просто написаний
явно.

Основні дійові особи:

| Клас | Про що він | Тип |
| --- | --- | --- |
| `File` | окремий файл: створити, прочитати, записати, видалити | статичний |
| `FileInfo` | той самий файл, але як об'єкт із властивостями | екземплярний |
| `Directory` | папка: створити, видалити, перелічити вміст | статичний |
| `DirectoryInfo` | папка як об'єкт | екземплярний |
| `Path` | робота з **рядками** шляхів (не чіпає диск!) | статичний |
| `StreamReader` / `StreamWriter` | послідовне читання/запис тексту | екземплярні |
| `BinaryReader` / `BinaryWriter` | те саме для двійкових даних | екземплярні |
| `FileStream` | «сирий» потік байтів у файл | екземплярний |

Про потоки — у наступних підрозділах. Тут розберемось із першими п'ятьма.

## Статичний клас чи клас-екземпляр

Пари `File`/`FileInfo` і `Directory`/`DirectoryInfo` роблять те саме, але
по-різному. Це збиває з пантелику, доки не зрозумієш логіку.

**Статичний** клас (`File`, `Directory`) — це набір готових операцій.
Ви щоразу передаєте шлях і отримуєте результат:

```csharp
bool exists = File.Exists("data.txt");
string text = File.ReadAllText("data.txt");
File.Delete("data.txt");
```

**Екземплярний** клас (`FileInfo`, `DirectoryInfo`) — це об'єкт, який
«представляє» конкретний файл. Ви створюєте його один раз і далі працюєте
з ним:

```csharp
FileInfo file = new FileInfo("data.txt");

if (file.Exists)
{
    Console.WriteLine($"Розмір: {file.Length} байт");
    Console.WriteLine($"Змінено: {file.LastWriteTime}");
    Console.WriteLine($"Розширення: {file.Extension}");
    file.Delete();
}
```

Різниця не косметична. Кожен виклик `File.щось(шлях)` змушує операційну
систему заново шукати файл і перевіряти права доступу. `FileInfo` робить це
один раз і кешує результат.

| Критерій | `File` / `Directory` (статичні) | `FileInfo` / `DirectoryInfo` |
| --- | --- | --- |
| Як користуватись | `File.Метод(шлях)` | створити об'єкт, потім `.Метод()` |
| Одна-дві операції з файлом | ✅ коротше й простіше | зайве |
| Багато операцій з одним файлом | ❌ перевірка прав щоразу | ✅ швидше |
| Потрібні властивості (розмір, дата) | ❌ доводиться викликати різні методи | ✅ усе в одному об'єкті |
| Перелічування вмісту папки | повертає рядки-шляхи | повертає готові об'єкти |
| Читабельність у навчальному коді | ✅ | трохи багатослівніше |

:::tip[Порада]
Для навчальних програм і простих задач беріть **статичні** `File`
і `Directory` — коду менше, читається краще. `FileInfo` знадобиться, коли
треба дізнатись розмір, дату зміни чи атрибути, або коли ви робите десяток
операцій з одним файлом у циклі.
:::

:::warning[Обережно]
`FileInfo` кешує дані. Якщо файл змінився після створення об'єкта,
властивості покажуть старі значення, доки ви не викличете `file.Refresh()`.
:::

## Шляхи: абсолютні та відносні

**Шлях** (англ. *path*) — це адреса файлу у файловій системі.

**Абсолютний шлях** починається від кореня диска і однозначно вказує на файл
з будь-якого місця:

```
C:\Users\Olena\Documents\grades.txt        (Windows)
/home/olena/documents/grades.txt           (Linux, macOS)
```

**Відносний шлях** відлічується від **поточної робочої директорії** програми:

```
grades.txt              файл поруч із програмою
data\grades.txt         у підпапці data
..\grades.txt           на рівень вище
.\data\grades.txt       те саме, що data\grades.txt (крапка — «тут»)
```

| Що | Абсолютний | Відносний |
| --- | --- | --- |
| Приклад | `C:\Data\report.csv` | `report.csv` |
| Залежить від робочої директорії | ❌ ні | ✅ так |
| Переносимість між комп'ютерами | ❌ погана | ✅ добра |
| Коли доречний | системні папки, вибір користувача через діалог | файли поруч із програмою, дані проєкту |

## Три способи зіпсувати шлях у C#

### 1. Забути про екранування

Це найперша помилка кожного, хто вперше пише шлях у C#:

```csharp
string path = "C:\data\report.txt";   // ← не працює як ви думаєте
```

Річ у тім, що зворотний слеш у рядку C# — **керуючий символ**. `\n` означає
перехід на новий рядок, `\t` — табуляцію. Отже, `\d` компілятор спробує
прочитати як спецсимвол (і видасть помилку `CS1009: Unrecognized escape
sequence`), а `\r` у слові `report` перетвориться на символ повернення
каретки.

Три правильні варіанти:

```csharp
// 1. Подвоїти слеші — кожен \\ означає один \
string a = "C:\\data\\report.txt";

// 2. Verbatim-рядок: символ @ перед лапками вимикає екранування
string b = @"C:\data\report.txt";

// 3. Прямі слеші — Windows розуміє і їх
string c = "C:/data/report.txt";
```

Варіант із `@` — найчитабельніший, у реальному коді використовують саме його.

:::info[Цікаво]
Verbatim-рядок (`@"..."`) корисний не лише для шляхів. Усередині нього
можна писати переноси рядків прямо в коді, а щоб вставити лапки — подвоїти
їх: `@"Він сказав ""привіт"""`. У C# 11 з'явилися ще й raw string literals
з трьома лапками, але для шляхів `@` цілком достатньо.
:::

### 2. Склеїти шляхи через плюс

Виглядає безневинно:

```csharp
string folder = "data";
string file = "report.txt";
string path = folder + "\\" + file;      // "data\report.txt" — начебто ок
```

А тепер уявіть, що `folder` прийшов ззовні і виявився `"data\"` — вийде
`"data\\report.txt"` із подвійним слешем. Або навпаки, слеш забули —
вийде `"datareport.txt"`. Або програму запустили на Linux, де розділювач
взагалі `/`.

Правильно — через `Path.Combine`:

```csharp
string path = Path.Combine("data", "report.txt");
Console.WriteLine(path);
```

**Вивід** на Windows:

```
data\report.txt
```

**Вивід** на Linux:

```
data/report.txt
```

`Path.Combine` сам ставить правильний розділювач, сам прибирає зайві
і працює з будь-якою кількістю частин:

```csharp
string full = Path.Combine("C:\\Users", "Olena", "Documents", "grades.csv");
```

:::danger[Часта помилка]
`Path.Combine` має одну неочевидну поведінку: якщо будь-яка частина
починається з розділювача або є абсолютним шляхом, **усі попередні
відкидаються**.

```csharp
Console.WriteLine(Path.Combine("C:\\Data", "\\report.txt"));
// Вивід: \report.txt   ← корінь диска, а не C:\Data\report.txt!
```

Тому частини, які ви передаєте, не повинні починатися зі слеша.
:::

### 3. Забути про крос-платформність

.NET 8 працює і на Windows, і на Linux, і на macOS. Розділювачі там різні,
і жорстко зашитий `\` зламає програму.

```csharp
Console.WriteLine($"Розділювач:      '{Path.DirectorySeparatorChar}'");
Console.WriteLine($"Роздільник шляхів: '{Path.PathSeparator}'");
Console.WriteLine($"Тимчасова папка:   {Path.GetTempPath()}");
```

**Вивід** на Windows:

```
Розділювач:      '\'
Роздільник шляхів: ';'
Тимчасова папка:   C:\Users\Olena\AppData\Local\Temp\
```

**Вивід** на Linux:

```
Розділювач:      '/'
Роздільник шляхів: ':'
Тимчасова папка:   /tmp/
```

### Корисні методи класу Path

`Path` не звертається до диска взагалі — він лише розбирає й складає рядки.
Файлу може навіть не існувати.

```csharp
string p = @"C:\Users\Olena\Documents\report.2026.csv";

Console.WriteLine(Path.GetFileName(p));               // report.2026.csv
Console.WriteLine(Path.GetFileNameWithoutExtension(p)); // report.2026
Console.WriteLine(Path.GetExtension(p));              // .csv
Console.WriteLine(Path.GetDirectoryName(p));          // C:\Users\Olena\Documents
Console.WriteLine(Path.GetPathRoot(p));               // C:\
Console.WriteLine(Path.IsPathRooted(p));              // True
Console.WriteLine(Path.ChangeExtension(p, ".txt"));   // ...\report.2026.txt
Console.WriteLine(Path.GetFullPath("data.txt"));      // абсолютний шлях
```

| Метод | Що робить |
| --- | --- |
| `Path.Combine(...)` | безпечно склеює частини шляху |
| `Path.GetFileName(p)` | ім'я файлу з розширенням |
| `Path.GetFileNameWithoutExtension(p)` | ім'я без розширення |
| `Path.GetExtension(p)` | розширення разом із крапкою |
| `Path.GetDirectoryName(p)` | шлях до папки, у якій лежить файл |
| `Path.GetFullPath(p)` | перетворює відносний шлях на абсолютний |
| `Path.IsPathRooted(p)` | чи шлях абсолютний |
| `Path.ChangeExtension(p, ext)` | замінює розширення |
| `Path.GetTempFileName()` | створює тимчасовий файл і повертає його шлях |
| `Path.GetInvalidFileNameChars()` | символи, заборонені в іменах файлів |

## Куди насправді потрапляє файл «data.txt»

Ось загадка, на якій спотикаються всі. Ви пишете:

```csharp
File.WriteAllText("data.txt", "Привіт");
```

Файл створюється. Ви шукаєте його поруч із `Program.cs` — і не знаходите.
Куди він подівся?

Відносний шлях відлічується від **поточної робочої директорії** — папки,
з якої запущено процес. А Visual Studio запускає програму не з папки проєкту,
а з папки збірки.

```
MyProject\                         ← папка проєкту, тут ваш Program.cs
│
├── Program.cs                     ← ви пишете код тут
├── MyProject.csproj
│
├── obj\                           ← проміжні файли компіляції
│
└── bin\
    └── Debug\
        └── net8.0\                ← ОСЬ ТУТ програма реально запускається
            ├── MyProject.exe      ← ваша скомпільована програма
            ├── MyProject.dll
            ├── MyProject.pdb
            └── data.txt           ← ОСЬ ТУТ з'явиться ваш файл
```

Перевірити це можна одним рядком:

```csharp
Console.WriteLine($"Робоча директорія: {Directory.GetCurrentDirectory()}");
Console.WriteLine($"Повний шлях файлу: {Path.GetFullPath("data.txt")}");
```

**Вивід:**

```
Робоча директорія: C:\Projects\MyProject\bin\Debug\net8.0
Повний шлях файлу: C:\Projects\MyProject\bin\Debug\net8.0\data.txt
```

:::tip[Порада]
Коли файл «не знайшовся» — **не гадайте**. Виведіть `Path.GetFullPath(шлях)`
і подивіться, куди саме програма дивиться. У дев'яти випадках із десяти
проблема саме в цьому, а не в коді читання.
:::

:::danger[Часта помилка]
Папка `bin` очищується при **Rebuild** і не потрапляє у систему контролю
версій. Якщо ви поклали туди важливі дані вручну — вони зникнуть.
Для навчальних програм це нормально, але майте на увазі.
:::

### Як покласти файл у передбачуване місце

Три робочі підходи:

```csharp
// 1. Явно вказати абсолютний шлях (найпростіше для навчання)
string path = @"C:\OPAM\grades.txt";

// 2. Папка «Документи» користувача — працює на будь-якій ОС
string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
string path2 = Path.Combine(docs, "grades.txt");

// 3. Папка поруч із виконуваним файлом (те саме, що просто "grades.txt",
//    але явно і зрозуміло)
string exeDir = AppContext.BaseDirectory;
string path3 = Path.Combine(exeDir, "grades.txt");

Console.WriteLine(path2);
```

**Вивід:**

```
C:\Users\Olena\Documents\grades.txt
```

Є ще один варіант — попросити Visual Studio копіювати файл даних у папку
збірки автоматично. Для цього у властивостях файлу в оглядачі рішень
поставте **Copy to Output Directory** = *Copy if newer*.

## Перевірка існування та створення

```csharp
string folder = @"C:\OPAM\reports";
string file = Path.Combine(folder, "january.txt");

// Папку створювати безпечно: якщо вона вже є, нічого не станеться
Directory.CreateDirectory(folder);

if (!File.Exists(file))
{
    File.WriteAllText(file, "Звіт за січень\n");
    Console.WriteLine("Файл створено.");
}
else
{
    Console.WriteLine("Файл уже існує.");
}
```

:::note
`Directory.CreateDirectory` створює **весь ланцюжок** папок одразу:
якщо немає ні `C:\OPAM`, ні `reports` — створяться обидві. І він не кидає
винятку, якщо папка вже є. Тому перевіряти `Directory.Exists` перед ним
не обов'язково.
:::

Базові операції з файлами і папками:

```csharp
File.Copy("a.txt", "b.txt", overwrite: true);   // копіювати
File.Move("b.txt", "c.txt");                    // перемістити або перейменувати
File.Delete("c.txt");                           // видалити (не в кошик!)

Directory.CreateDirectory("archive");
Directory.Move("archive", "old_archive");
Directory.Delete("old_archive", recursive: true);  // разом із вмістом
```

:::danger[Часта помилка]
`File.Delete` видаляє **назавжди**, повз кошик. Відновити стандартними
засобами не вийде. Будьте особливо обережні у циклах: один неправильний
шлях — і ви видалили не те. Перед `Delete` у навчальних програмах корисно
виводити на екран, що саме видаляється.

І ще: `File.Delete` **не** кидає виняток, якщо файлу немає — просто нічого
не робить. А от `Directory.Delete` для неіснуючої папки виняток кине.
:::

## Перелічування вмісту папки

Задача: показати всі файли у папці. Найпростіший спосіб:

```csharp
string folder = @"C:\OPAM";

string[] files = Directory.GetFiles(folder);

foreach (string f in files)
{
    Console.WriteLine(Path.GetFileName(f));
}
```

`GetFiles` повертає **масив повних шляхів**, тому для виводу самих імен
потрібен `Path.GetFileName`.

### Фільтр за маскою

Другим аргументом можна передати шаблон:

```csharp
string[] texts = Directory.GetFiles(folder, "*.txt");        // усі .txt
string[] reports = Directory.GetFiles(folder, "report*.*");  // ті, що починаються з report
string[] logs = Directory.GetFiles(folder, "log_202?.txt");  // один будь-який символ замість ?
```

| Символ маски | Означає |
| --- | --- |
| `*` | будь-яка кількість будь-яких символів (у тому числі нуль) |
| `?` | рівно один будь-який символ |

### Рекурсивний обхід

Щоб зазирнути і в підпапки, передайте третій аргумент:

```csharp
string[] all = Directory.GetFiles(folder, "*.cs", SearchOption.AllDirectories);
Console.WriteLine($"Знайдено файлів .cs: {all.Length}");
```

| Значення `SearchOption` | Що робить |
| --- | --- |
| `TopDirectoryOnly` (за замовчуванням) | тільки задана папка |
| `AllDirectories` | папка та всі вкладені, на будь-яку глибину |

:::warning[Обережно]
`SearchOption.AllDirectories` на великій папці (наприклад, на `C:\`)
працюватиме довго і майже напевно впаде з `UnauthorizedAccessException`
на першій же системній папці, куди немає доступу. Обгортайте у `try/catch`
і не запускайте на кореневих дисках.
:::

Схема того, що обходиться:

```
C:\OPAM\                         ← стартова папка
│
├── notes.txt          ✔ TopDirectoryOnly  ✔ AllDirectories
├── report.csv         ✔ TopDirectoryOnly  ✔ AllDirectories
│
├── lab1\
│   ├── Program.cs                          ✔ AllDirectories
│   └── data\
│       └── input.txt                       ✔ AllDirectories
│
└── lab2\
    └── Program.cs                          ✔ AllDirectories
```

І папки теж можна перелічити:

```csharp
string[] dirs = Directory.GetDirectories(folder);
foreach (string d in dirs)
{
    Console.WriteLine($"[папка] {Path.GetFileName(d)}");
}
```

:::info[Цікаво]
Крім `GetFiles`, є `EnumerateFiles`. Різниця в тому, що `GetFiles` спочатку
збирає **весь** список у масив, а `EnumerateFiles` віддає імена по одному,
поки ви їх обробляєте. На папці з мільйоном файлів перший з'їсть багато
пам'яті й змусить чекати, а другий почне працювати одразу. Для навчальних
задач різниці немає, але знати варто.
:::

## Розмір, дати та атрибути файлу

Ось де `FileInfo` показує себе з кращого боку:

```csharp
string path = @"C:\OPAM\report.csv";

if (File.Exists(path))
{
    FileInfo info = new FileInfo(path);

    Console.WriteLine($"Ім'я:        {info.Name}");
    Console.WriteLine($"Папка:       {info.DirectoryName}");
    Console.WriteLine($"Розширення:  {info.Extension}");
    Console.WriteLine($"Розмір:      {info.Length} байт");
    Console.WriteLine($"Створено:    {info.CreationTime:dd.MM.yyyy HH:mm}");
    Console.WriteLine($"Змінено:     {info.LastWriteTime:dd.MM.yyyy HH:mm}");
    Console.WriteLine($"Лише читання: {info.IsReadOnly}");
}
```

**Вивід:**

```
Ім'я:        report.csv
Папка:       C:\OPAM
Розширення:  .csv
Розмір:      2048 байт
Створено:    01.09.2026 09:14
Змінено:     13.09.2026 11:02
Лише читання: False
```

Розмір у байтах читати незручно. Маленький помічник:

```csharp
string FormatSize(long bytes)
{
    if (bytes < 1024) return $"{bytes} Б";
    if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} КБ";
    if (bytes < 1024L * 1024 * 1024) return $"{bytes / (1024.0 * 1024):F1} МБ";
    return $"{bytes / (1024.0 * 1024 * 1024):F2} ГБ";
}

Console.WriteLine(FormatSize(2048));        // 2,0 КБ
Console.WriteLine(FormatSize(5_242_880));   // 5,0 МБ
```

### Атрибути

```csharp
FileAttributes attrs = File.GetAttributes(path);

Console.WriteLine($"Прихований:   {attrs.HasFlag(FileAttributes.Hidden)}");
Console.WriteLine($"Лише читання: {attrs.HasFlag(FileAttributes.ReadOnly)}");
Console.WriteLine($"Це папка:     {attrs.HasFlag(FileAttributes.Directory)}");
```

## Практичний приклад: звіт по папці

Складемо все докупи — програма показує зведення по папці.

```csharp
string folder = @"C:\OPAM";

if (!Directory.Exists(folder))
{
    Console.WriteLine($"Папки {folder} не існує.");
    return;
}

string[] files = Directory.GetFiles(folder, "*.*", SearchOption.TopDirectoryOnly);
long totalSize = 0;
string biggestName = "—";
long biggestSize = -1;

Console.WriteLine($"{"Файл",-25} {"Розмір, Б",12}  Змінено");
Console.WriteLine(new string('-', 60));

foreach (string path in files)
{
    FileInfo info = new FileInfo(path);
    totalSize += info.Length;

    if (info.Length > biggestSize)
    {
        biggestSize = info.Length;
        biggestName = info.Name;
    }

    Console.WriteLine($"{info.Name,-25} {info.Length,12}  {info.LastWriteTime:dd.MM.yyyy}");
}

Console.WriteLine(new string('-', 60));
Console.WriteLine($"Усього файлів: {files.Length}");
Console.WriteLine($"Сумарний розмір: {totalSize} байт");
Console.WriteLine($"Найбільший: {biggestName} ({biggestSize} байт)");
```

**Вивід:**

```
Файл                         Розмір, Б  Змінено
------------------------------------------------------------
grades.csv                        1024  10.09.2026
notes.txt                          312  11.09.2026
report.pdf                      458752  13.09.2026
------------------------------------------------------------
Усього файлів: 3
Сумарний розмір: 460088 байт
Найбільший: report.pdf (458752 байт)
```

Зверніть увагу на `{info.Name,-25}` — це **вирівнювання** в інтерполяції
рядків: від'ємне число вирівнює за лівим краєм, додатне — за правим.
Саме так роблять акуратні таблиці у консолі.

## Типові помилки

**1. Писати шлях без екранування.**

```csharp
string path = "C:\data\file.txt";     // CS1009 або зіпсований рядок
string path = @"C:\data\file.txt";    // правильно
```

**2. Склеювати шляхи через `+`.**
Рано чи пізно вийде подвійний слеш або жодного. Використовуйте `Path.Combine`.

**3. Шукати створений файл поруч із `Program.cs`.**
Він у `bin\Debug\net8.0`. Виведіть `Path.GetFullPath(...)` і переконайтесь.

**4. Плутати `Path.GetFileName` і `Path.GetDirectoryName`.**
Перший дає ім'я файлу, другий — папку. Легко переплутати місцями і потім
довго дивуватись.

**5. Вважати, що `File.Exists` гарантує успішне читання.**
Файл може існувати, але бути відкритим у Excel, лежати на відключеній
мережевій папці або бути захищеним від читання. Перевірка не заміняє
`try/catch` — вона лише дає гарне повідомлення у звичайному випадку.

## Що далі

Ми навчилися знаходити файли й дізнаватися про них усе. У наступному
підрозділі — найголовніше: як прочитати з файлу текст і як записати його
туди, чим прості методи `File.*` відрізняються від потоків `StreamReader`
і `StreamWriter`, і чому кирилиця іноді перетворюється на кракозябри.
