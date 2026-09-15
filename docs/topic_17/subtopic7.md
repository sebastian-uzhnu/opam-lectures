---
sidebar_position: 8
---

# Практичний приклад: каталог медіафайлів

Ми розібрали абстрактні класи, інтерфейси, різницю між ними та принципи SOLID
окремо, по частинах. Тепер зберемо все в одну програму, яку можна відкрити
у Visual Studio і запустити.

Задача навмисно взята близька до життя: **каталог медіафайлів**. Такий каталог
має будь-який музичний застосунок, будь-яка онлайн-бібліотека і навіть папка
«Завантаження» на вашому комп'ютері.

## Аналіз задачі: що спільне, а що різне

Випишемо, що зберігається в каталозі:

- аудіозаписи — пісні, подкасти;
- відео — фільми, записи лекцій;
- електронні книги.

Тепер найважливіше питання проєктування: **що спільного у всіх трьох?**

| Властивість | Аудіо | Відео | Книга |
|---|---|---|---|
| Назва, автор, рік, розмір | так | так | так |
| Можна відтворити (Play/Stop) | так | так | **ні** |
| Має тривалість | так | так | ні |
| Можна завантажити на диск | так | так | так |
| Роздільна здатність | ні | так | ні |
| Кількість сторінок | ні | ні | так |

З таблиці видно два різні види спільності, і для них у C# є два різні
інструменти.

**Перший рядок** — це спільні **дані та поведінка**: назва, автор, рік, розмір.
Вони однакові для всіх і потребують полів та конструктора. Це робота для
**абстрактного класу**.

**Рядки «можна відтворити» і «можна завантажити»** — це спільні **вміння**,
причому вони розподілені між типами по-різному: відтворювати вміють двоє з
трьох, завантажувати — усі троє. Це робота для **інтерфейсів**.

```
                     MediaFile (abstract)
                 Title, Author, SizeMb, Year
                  abstract GetMediaType()
                  abstract GetDetails()
                  IComparable (сортування)
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
     AudioFile          VideoFile         EbookFile
          │                 │                 │
   IPlayable         IPlayable                │
   IDownloadable     IDownloadable     IDownloadable
```

Зверніть увагу: `EbookFile` навмисно **не реалізує** `IPlayable`. Книгу не
можна «програти». Саме заради цього ми й розділили вміння на два інтерфейси —
якби існував один великий `IMedia` з методами `Play` і `Download` разом,
книзі довелося б реалізовувати `Play` заглушкою.

:::info[Цікаво]
Це і є **принцип розділення інтерфейсів** (Interface Segregation, буква I
в SOLID) із попереднього підрозділу, але побачений з практичного боку:
краще кілька маленьких інтерфейсів, кожен із яких комусь справді потрібен,
ніж один великий, половину якого всі змушені реалізовувати «аби було».
:::

## Абстрактний базовий клас

```csharp
abstract class MediaFile : IComparable<MediaFile>
{
    public string Title { get; }
    public string Author { get; }
    public double SizeMb { get; }
    public int Year { get; }

    // protected, бо конструктор абстрактного класу викликають лише нащадки
    protected MediaFile(string title, string author, double sizeMb, int year)
    {
        Title = title;
        Author = author;
        SizeMb = sizeMb;
        Year = year;
    }

    // Кожен нащадок зобов'язаний сказати, що він таке
    public abstract string GetMediaType();

    // І доповнити картку своїми специфічними даними
    public abstract string GetDetails();

    // Спільна реалізація: однакова для всіх, писати заново не треба
    public string GetInfo()
        => $"{GetMediaType(),-6} | {Title,-22} | {Author,-15} | {SizeMb,7:F1} МБ | {Year}";

    public void PrintCard()
    {
        Console.WriteLine(GetInfo());
        Console.WriteLine($"         └─ {GetDetails()}");
    }

    // Сортування каталогу: за розміром від меншого до більшого
    public int CompareTo(MediaFile? other)
    {
        if (other is null) return 1;
        return SizeMb.CompareTo(other.SizeMb);
    }
}
```

Тут видно всі три причини, заради яких існує абстрактний клас:

1. **Спільні дані.** Чотири властивості й конструктор написані один раз.
2. **Спільна поведінка.** Методи `GetInfo` і `PrintCard` мають готове тіло.
3. **Обов'язок нащадка.** `GetMediaType` і `GetDetails` оголошені `abstract`:
   компілятор не дасть створити нащадка, який їх не реалізував.

Метод `GetInfo` заслуговує окремої уваги. Він викликає `GetMediaType()` і
`GetDetails()`, яких сам не має. Такий прийом називається **шаблонний метод**
(template method): базовий клас задає загальний порядок дій, а нащадки
заповнюють «дірки».

:::warning[Обережно]
Конструктор абстрактного класу оголошено `protected`, а не `public`.
Це не обов'язково (створити екземпляр абстрактного класу все одно не вийде),
але це чесно показує читачеві: конструктор призначений для нащадків, а не
для зовнішнього коду.
:::

## Інтерфейси-вміння

```csharp
interface IPlayable
{
    TimeSpan Duration { get; }

    void Play();
    void Stop();
}

interface IDownloadable
{
    bool IsDownloaded { get; }

    void Download(string folder);
}
```

Обидва інтерфейси крихітні — по два-три члени. Це нормально і правильно.
Інтерфейс описує **одне вміння**, а не весь клас.

## Нащадок 1: аудіофайл

```csharp
class AudioFile : MediaFile, IPlayable, IDownloadable
{
    public TimeSpan Duration { get; }
    public int BitrateKbps { get; }
    public bool IsDownloaded { get; private set; }

    public AudioFile(string title, string author, double sizeMb, int year,
                     TimeSpan duration, int bitrateKbps)
        : base(title, author, sizeMb, year)      // спільні дані віддаємо базовому класу
    {
        Duration = duration;
        BitrateKbps = bitrateKbps;
    }

    public override string GetMediaType() => "Аудіо";

    public override string GetDetails()
        => $"бітрейт {BitrateKbps} kbps, тривалість {Duration.ToString(@"h\:mm\:ss")}";

    public void Play()
        => Console.WriteLine($"   Відтворення аудіо: «{Title}» — {Author} " +
                             $"({Duration.ToString(@"h\:mm\:ss")})");

    public void Stop()
        => Console.WriteLine($"   Зупинено: «{Title}»");

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Music — «{Title}»");
    }
}
```

## Нащадок 2: відеофайл

```csharp
class VideoFile : MediaFile, IPlayable, IDownloadable
{
    public TimeSpan Duration { get; }
    public string Resolution { get; }
    public bool IsDownloaded { get; private set; }

    public VideoFile(string title, string author, double sizeMb, int year,
                     TimeSpan duration, string resolution)
        : base(title, author, sizeMb, year)
    {
        Duration = duration;
        Resolution = resolution;
    }

    public override string GetMediaType() => "Відео";

    public override string GetDetails()
        => $"{Resolution}, тривалість {Duration.ToString(@"h\:mm\:ss")}";

    public void Play()
        => Console.WriteLine($"   Відтворення відео: «{Title}» {Resolution} " +
                             $"({Duration.ToString(@"h\:mm\:ss")})");

    public void Stop()
        => Console.WriteLine($"   Зупинено: «{Title}»");

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Video — «{Title}»");
    }
}
```

`AudioFile` і `VideoFile` реалізують ті самі два інтерфейси, але по-різному:
аудіо пише в консоль бітрейт, відео — роздільну здатність. Контракт один,
виконання різне — це поліморфізм.

## Нащадок 3: електронна книга

```csharp
class EbookFile : MediaFile, IDownloadable       // IPlayable тут НЕМАЄ
{
    public int Pages { get; }
    public string Format { get; }
    public bool IsDownloaded { get; private set; }

    public EbookFile(string title, string author, double sizeMb, int year,
                     int pages, string format)
        : base(title, author, sizeMb, year)
    {
        Pages = pages;
        Format = format;
    }

    public override string GetMediaType() => "Книга";

    public override string GetDetails() => $"{Pages} с., формат {Format}";

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Books — «{Title}»");
    }

    // Методів Play і Stop тут немає — і це не помилка, а свідоме рішення
}
```

Найповчальніше в цьому класі — те, чого в ньому **немає**. Ми не пишемо
`Play()`, який кидає виняток, і не пишемо порожній `Play()`, який мовчки
нічого не робить. Ми просто не оголошуємо клас `IPlayable` — і компілятор
разом з нами стежить, щоб книгу ніхто не намагався програти.

## Робота з колекцією базового типу

Каталог зберігається як масив **базового** типу. Це дозволяє тримати різні
класи в одній структурі:

```csharp
MediaFile[] catalog =
[
    new AudioFile("Обійми", "Океан Ельзи", 8.4, 2013, new TimeSpan(0, 4, 12), 320),
    new VideoFile("Лекція 17. Інтерфейси", "Іванов П. К.", 420.0, 2024,
                  new TimeSpan(1, 18, 40), "1920x1080"),
    new EbookFile("Кобзар", "Тарас Шевченко", 2.1, 1840, 312, "epub"),
    new AudioFile("Алгоритми. Подкаст", "DEV.UA", 25.7, 2023, new TimeSpan(0, 32, 5), 128),
    new EbookFile("C# 12 in a Nutshell", "J. Albahari", 14.8, 2024, 1090, "pdf")
];
```

Тип елемента — `MediaFile`, тому через змінну циклу доступні лише члени
базового класу. Щоб дістатися до `Play()`, треба **спитати, чи вміє цей
об'єкт відтворюватися**:

```csharp
foreach (MediaFile item in catalog)
{
    if (item is IPlayable playable)      // перевірка типу + приведення одним рухом
    {
        playable.Play();
        playable.Stop();
    }
    else
    {
        Console.WriteLine($"   (пропущено: «{item.Title}» відтворити не можна)");
    }
}
```

Конструкція `item is IPlayable playable` — це **зіставлення з шаблоном**
(pattern matching) з C# 7. Вона робить дві речі за раз: перевіряє, чи реалізує
об'єкт інтерфейс, і, якщо так, одразу створює змінну `playable` потрібного типу.

Порівняйте зі старим стилем, який ще трапляється в підручниках:

```csharp
// так писали раніше — не робіть так
if (item is IPlayable)
{
    IPlayable p = (IPlayable)item;   // перевірка типу виконується двічі
    p.Play();
}
```

| Прийом | Що робить | Коли використовувати |
|---|---|---|
| `item is IPlayable p` | перевіряє і приводить | коли об'єкт **може** не підходити |
| `(IPlayable)item` | приводить, інакше виняток | коли ви **впевнені** в типі |
| `item as IPlayable` | приводить або дає `null` | коли далі однаково перевіряти на `null` |

## Повний код програми

```csharp
using System;

// ---------- Інтерфейси-вміння ----------
interface IPlayable
{
    TimeSpan Duration { get; }
    void Play();
    void Stop();
}

interface IDownloadable
{
    bool IsDownloaded { get; }
    void Download(string folder);
}

// ---------- Абстрактний базовий клас ----------
abstract class MediaFile : IComparable<MediaFile>
{
    public string Title { get; }
    public string Author { get; }
    public double SizeMb { get; }
    public int Year { get; }

    protected MediaFile(string title, string author, double sizeMb, int year)
    {
        Title = title;
        Author = author;
        SizeMb = sizeMb;
        Year = year;
    }

    public abstract string GetMediaType();
    public abstract string GetDetails();

    public string GetInfo()
        => $"{GetMediaType(),-6} | {Title,-22} | {Author,-15} | {SizeMb,7:F1} МБ | {Year}";

    public void PrintCard()
    {
        Console.WriteLine(GetInfo());
        Console.WriteLine($"         └─ {GetDetails()}");
    }

    public int CompareTo(MediaFile? other)
    {
        if (other is null) return 1;
        return SizeMb.CompareTo(other.SizeMb);
    }
}

// ---------- Нащадки ----------
class AudioFile : MediaFile, IPlayable, IDownloadable
{
    public TimeSpan Duration { get; }
    public int BitrateKbps { get; }
    public bool IsDownloaded { get; private set; }

    public AudioFile(string title, string author, double sizeMb, int year,
                     TimeSpan duration, int bitrateKbps)
        : base(title, author, sizeMb, year)
    {
        Duration = duration;
        BitrateKbps = bitrateKbps;
    }

    public override string GetMediaType() => "Аудіо";

    public override string GetDetails()
        => $"бітрейт {BitrateKbps} kbps, тривалість {Duration.ToString(@"h\:mm\:ss")}";

    public void Play()
        => Console.WriteLine($"   Відтворення аудіо: «{Title}» — {Author} " +
                             $"({Duration.ToString(@"h\:mm\:ss")})");

    public void Stop()
        => Console.WriteLine($"   Зупинено: «{Title}»");

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Music — «{Title}»");
    }
}

class VideoFile : MediaFile, IPlayable, IDownloadable
{
    public TimeSpan Duration { get; }
    public string Resolution { get; }
    public bool IsDownloaded { get; private set; }

    public VideoFile(string title, string author, double sizeMb, int year,
                     TimeSpan duration, string resolution)
        : base(title, author, sizeMb, year)
    {
        Duration = duration;
        Resolution = resolution;
    }

    public override string GetMediaType() => "Відео";

    public override string GetDetails()
        => $"{Resolution}, тривалість {Duration.ToString(@"h\:mm\:ss")}";

    public void Play()
        => Console.WriteLine($"   Відтворення відео: «{Title}» {Resolution} " +
                             $"({Duration.ToString(@"h\:mm\:ss")})");

    public void Stop()
        => Console.WriteLine($"   Зупинено: «{Title}»");

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Video — «{Title}»");
    }
}

class EbookFile : MediaFile, IDownloadable
{
    public int Pages { get; }
    public string Format { get; }
    public bool IsDownloaded { get; private set; }

    public EbookFile(string title, string author, double sizeMb, int year,
                     int pages, string format)
        : base(title, author, sizeMb, year)
    {
        Pages = pages;
        Format = format;
    }

    public override string GetMediaType() => "Книга";

    public override string GetDetails() => $"{Pages} с., формат {Format}";

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Books — «{Title}»");
    }
}

// ---------- Програма ----------
class Program
{
    static void Main()
    {
        MediaFile[] catalog =
        [
            new AudioFile("Обійми", "Океан Ельзи", 8.4, 2013, new TimeSpan(0, 4, 12), 320),
            new VideoFile("Лекція 17. Інтерфейси", "Іванов П. К.", 420.0, 2024,
                          new TimeSpan(1, 18, 40), "1920x1080"),
            new EbookFile("Кобзар", "Тарас Шевченко", 2.1, 1840, 312, "epub"),
            new AudioFile("Алгоритми. Подкаст", "DEV.UA", 25.7, 2023,
                          new TimeSpan(0, 32, 5), 128),
            new EbookFile("C# 12 in a Nutshell", "J. Albahari", 14.8, 2024, 1090, "pdf")
        ];

        Console.WriteLine("=== КАТАЛОГ (порядок додавання) ===");
        foreach (MediaFile item in catalog)
        {
            item.PrintCard();
        }

        // Сортування працює завдяки IComparable в базовому класі
        Array.Sort(catalog);

        Console.WriteLine();
        Console.WriteLine("=== КАТАЛОГ, відсортований за розміром ===");
        foreach (MediaFile item in catalog)
        {
            Console.WriteLine($"{item.SizeMb,7:F1} МБ   {item.Title,-22} ({item.GetMediaType()})");
        }

        Console.WriteLine();
        Console.WriteLine("=== Що можна відтворити ===");
        foreach (MediaFile item in catalog)
        {
            if (item is IPlayable playable)
            {
                playable.Play();
                playable.Stop();
            }
            else
            {
                Console.WriteLine($"   (пропущено: «{item.Title}» відтворити не можна)");
            }
        }

        Console.WriteLine();
        Console.WriteLine("=== Завантаження каталогу ===");
        double downloadedSize = 0;
        int playableCount = 0;
        TimeSpan totalDuration = TimeSpan.Zero;

        foreach (MediaFile item in catalog)
        {
            if (item is IDownloadable downloadable)
            {
                downloadable.Download("D:\\Media");
                downloadedSize += item.SizeMb;
            }

            if (item is IPlayable playable)
            {
                playableCount++;
                totalDuration += playable.Duration;
            }
        }

        Console.WriteLine();
        Console.WriteLine("=== Підсумок ===");
        Console.WriteLine($"Файлів у каталозі:       {catalog.Length}");
        Console.WriteLine($"Завантажено:             {downloadedSize:F1} МБ");
        Console.WriteLine($"Можна відтворити:        {playableCount}");
        Console.WriteLine($"Загальна тривалість:     {totalDuration.ToString(@"h\:mm\:ss")}");
    }
}
```

**Вивід:**

```
=== КАТАЛОГ (порядок додавання) ===
Аудіо  | Обійми                 | Океан Ельзи     |     8,4 МБ | 2013
         └─ бітрейт 320 kbps, тривалість 0:04:12
Відео  | Лекція 17. Інтерфейси  | Іванов П. К.    |   420,0 МБ | 2024
         └─ 1920x1080, тривалість 1:18:40
Книга  | Кобзар                 | Тарас Шевченко  |     2,1 МБ | 1840
         └─ 312 с., формат epub
Аудіо  | Алгоритми. Подкаст     | DEV.UA          |    25,7 МБ | 2023
         └─ бітрейт 128 kbps, тривалість 0:32:05
Книга  | C# 12 in a Nutshell    | J. Albahari     |    14,8 МБ | 2024
         └─ 1090 с., формат pdf

=== КАТАЛОГ, відсортований за розміром ===
    2,1 МБ   Кобзар                 (Книга)
    8,4 МБ   Обійми                 (Аудіо)
   14,8 МБ   C# 12 in a Nutshell    (Книга)
   25,7 МБ   Алгоритми. Подкаст     (Аудіо)
  420,0 МБ   Лекція 17. Інтерфейси  (Відео)

=== Що можна відтворити ===
   (пропущено: «Кобзар» відтворити не можна)
   Відтворення аудіо: «Обійми» — Океан Ельзи (0:04:12)
   Зупинено: «Обійми»
   (пропущено: «C# 12 in a Nutshell» відтворити не можна)
   Відтворення аудіо: «Алгоритми. Подкаст» — DEV.UA (0:32:05)
   Зупинено: «Алгоритми. Подкаст»
   Відтворення відео: «Лекція 17. Інтерфейси» 1920x1080 (1:18:40)
   Зупинено: «Лекція 17. Інтерфейси»

=== Завантаження каталогу ===
   Збережено    2,1 МБ у D:\Media\Books — «Кобзар»
   Збережено    8,4 МБ у D:\Media\Music — «Обійми»
   Збережено   14,8 МБ у D:\Media\Books — «C# 12 in a Nutshell»
   Збережено   25,7 МБ у D:\Media\Music — «Алгоритми. Подкаст»
   Збережено  420,0 МБ у D:\Media\Video — «Лекція 17. Інтерфейси»

=== Підсумок ===
Файлів у каталозі:       5
Завантажено:             471,0 МБ
Можна відтворити:        3
Загальна тривалість:     1:54:57
```

:::tip[Порада]
Розберіть вивід по порядку: перша частина йде в порядку додавання, друга —
вже відсортована, бо `Array.Sort` змінив сам масив. Якщо потрібно і те, і те,
робіть копію: `var sorted = (MediaFile[])catalog.Clone();` і сортуйте копію.
:::

:::info[Цікаво]
`Array.Sort(catalog)` не знає нічого про медіафайли. Він просто викликає
`CompareTo` на елементах і за результатом вирішує, хто раніше. Змініть одну
строчку в `CompareTo` — `return Year.CompareTo(other.Year);` — і каталог
почне сортуватися за роком. Уся решта програми залишиться незмінною.
Це той самий ефект, що і з `INotifier`: логіка сортування відокремлена
від логіки порівняння контрактом `IComparable`.
:::

## Як розширити каталог

Перевірмо проєкт на міцність. Додамо підкаст-епізод, який і відтворюється,
і завантажується, і має ще й номер випуску:

```csharp
class PodcastEpisode : MediaFile, IPlayable, IDownloadable
{
    public TimeSpan Duration { get; }
    public int EpisodeNumber { get; }
    public bool IsDownloaded { get; private set; }

    public PodcastEpisode(string title, string author, double sizeMb, int year,
                          TimeSpan duration, int episodeNumber)
        : base(title, author, sizeMb, year)
    {
        Duration = duration;
        EpisodeNumber = episodeNumber;
    }

    public override string GetMediaType() => "Подк.";

    public override string GetDetails()
        => $"випуск №{EpisodeNumber}, тривалість {Duration.ToString(@"h\:mm\:ss")}";

    public void Play()
        => Console.WriteLine($"   Відтворення подкасту: випуск №{EpisodeNumber} «{Title}»");

    public void Stop() => Console.WriteLine($"   Зупинено: «{Title}»");

    public void Download(string folder)
    {
        IsDownloaded = true;
        Console.WriteLine($"   Збережено {SizeMb,6:F1} МБ у {folder}\\Podcasts — «{Title}»");
    }
}
```

Скільки рядків довелося змінити в `MediaFile`, `AudioFile`, `VideoFile`,
`EbookFile` і в циклах `Main`? Жодного. Достатньо додати новий об'єкт до
масиву — і він одразу з'явиться у виводі, візьме участь у сортуванні,
відтвориться і завантажиться. Якщо архітектура спроєктована на абстракціях,
розширення коштує один новий файл.

## Типові помилки

### Помилка 1. Інтерфейс із п'ятнадцятьма методами

**Як роблять:**

```csharp
interface IMedia
{
    void Play();
    void Pause();
    void Stop();
    void Rewind(int seconds);
    void SetVolume(int level);
    void Download(string folder);
    void Delete();
    void Rename(string newTitle);
    void AddToPlaylist(string playlist);
    void Share(string contact);
    void Rate(int stars);
    void ShowSubtitles();
    void ChangeResolution(string resolution);
    void TurnPage(int page);
    void SetBookmark(int position);
}
```

**Що станеться:** кожен клас змушений реалізувати всі п'ятнадцять методів,
хоча книзі не потрібні гучність і субтитри, а пісні — перегортання сторінок.
Замість корисного контракту виходить примусова робота.

**Як правильно:** розбити на маленькі інтерфейси за вміннями — `IPlayable`,
`IDownloadable`, `IShareable`, `IRateable` — і реалізовувати лише потрібні.
Орієнтир для навчального проєкту: **інтерфейс на 1–4 члени**. Більше —
привід замислитись, чи не змішалися в ньому дві різні ролі.

### Помилка 2. Абстрактний клас там, де досить інтерфейсу

**Як роблять:**

```csharp
abstract class Playable
{
    public abstract void Play();
    public abstract void Stop();
}

class AudioFile : Playable { }     // а як тепер успадкувати ще й MediaFile?
```

**Що станеться:** у C# клас може мати **тільки один** базовий клас.
Витративши цю єдину можливість на «вміння», ви більше не зможете успадкувати
спільні дані. Проєкт зайде в глухий кут.

**Як правильно:** абстрактний клас — для спільних **даних і стану**
(`Title`, `Author`, `SizeMb`), інтерфейс — для **вмінь** (`Play`, `Download`).
Інтерфейсів можна реалізувати скільки завгодно.

| Ознака | Обирайте |
|---|---|
| Є спільні поля та конструктор | абстрактний клас |
| Є готовий код, спільний для всіх нащадків | абстрактний клас |
| Спільна лише назва дії, реалізації різні | інтерфейс |
| Вміння потрібне класам з різних ієрархій | інтерфейс |
| Потрібно і те, і те | абстрактний клас **плюс** інтерфейси |

### Помилка 3. Реалізація інтерфейсу заглушками

**Як роблять:**

```csharp
class EbookFile : MediaFile, IPlayable, IDownloadable
{
    public TimeSpan Duration => TimeSpan.Zero;

    public void Play()
    {
        throw new NotSupportedException("Книгу не можна відтворити");
    }

    public void Stop() { }        // мовчки нічого не робить
}
```

**Що станеться:** компілятор задоволений, а програма — ні. Цикл
`if (item is IPlayable p) p.Play();` чесно вважає книгу відтворюваною,
викликає `Play()` і отримує виняток посеред нормальної роботи. Другий
варіант, порожній `Stop()`, ще підступніший: помилки немає, просто нічого
не відбувається, і шукати причину доведеться довго.

**Як правильно:** не реалізовувати інтерфейс, якого клас не виконує. Якщо
книга не відтворюється — вона не `IPlayable`, крапка. Тоді перевірка
`is IPlayable` дає правильну відповідь, і компілятор допомагає, а не заважає.

:::danger[Часта помилка]
Заглушка з `throw new NotSupportedException` порушує **принцип підстановки
Лісков** (буква L у SOLID): нащадка не можна використати замість базового
типу без сюрпризів. Якщо вам доводиться писати такий метод — майже завжди це
означає, що інтерфейс треба розділити на менші.
:::

### Помилка 4. Приведення типу без перевірки

**Як роблять:**

```csharp
foreach (MediaFile item in catalog)
{
    IPlayable playable = (IPlayable)item;   // а раптом це книга?
    playable.Play();
}
```

**Що станеться:** на першій же книзі програма впаде з
`InvalidCastException`. Помилка проявиться лише під час виконання і лише
на тих даних, де є книга, — на тестовому наборі з двох пісень усе
«працюватиме».

**Як правильно:** завжди питати перед приведенням:

```csharp
if (item is IPlayable playable)
{
    playable.Play();
}
```
