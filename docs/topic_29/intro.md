---
sidebar_position: 1
---

# XML: структура та основи читання

## Що таке XML

**XML (eXtensible Markup Language)** — мова розмітки для зберігання та передачі структурованих даних у вигляді тексту. XML файл може відкрити і прочитати будь-яка програма на будь-якій платформі.

Типові сфери застосування XML у .NET-розробці:
- Конфігураційні файли (`app.config`, `web.config`)
- Серіалізація та збереження даних додатку
- Обмін даними між системами (веб-сервіси SOAP)
- Формати документів (Office Open XML, SVG, XAML)

## Синтаксис XML

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Це коментар -->
<library>
    <book id="1" genre="fiction">
        <title>Майстер і Маргарита</title>
        <author>Михайло Булгаков</author>
        <year>1967</year>
        <price currency="UAH">320.00</price>
    </book>
    <book id="2" genre="classic">
        <title>Кобзар</title>
        <author>Тарас Шевченко</author>
        <year>1840</year>
        <price currency="UAH">180.00</price>
    </book>
</library>
```

Основні поняття:

| Термін | Приклад | Пояснення |
|---|---|---|
| **Елемент** | `<title>Кобзар</title>` | Основна одиниця XML |
| **Атрибут** | `id="1"` | Метадані всередині тегу |
| **Кореневий елемент** | `<library>` | Один на весь документ |
| **Текстовий вузол** | `Кобзар` | Вміст між тегами |
| **Коментар** | `<!-- ... -->` | Ігнорується парсером |
| **Декларація** | `<?xml version="1.0"?>` | Перший рядок документу |

:::warning Правила XML
- Кожен тег **обов'язково закривається**: `<tag></tag>` або `<tag/>`
- XML **чутливий до регістру**: `<Title>` ≠ `<title>`
- Один **кореневий елемент** на документ
- Атрибути беруться **у лапки**: `id="1"`, не `id=1`
- Спеціальні символи **екрануються**: `&amp;` = `&`, `&lt;` = `<`, `&gt;` = `>`
:::

## Два підходи до роботи з XML у .NET

| Підхід | Клас | Коли використовувати |
|---|---|---|
| **DOM (Document Object Model)** | `XmlDocument` | Старий API, рідше використовується |
| **LINQ to XML** | `XDocument`, `XElement` | Сучасний, рекомендований |

Ми будемо використовувати **LINQ to XML** (`XDocument`) — він простіший, лаконічніший і природно інтегрується з LINQ-запитами.

```csharp
// Підключаємо простір імен
using System.Xml.Linq;
```

## XDocument: завантаження і читання

### Завантаження XML

```csharp
// З файлу
XDocument doc = XDocument.Load("library.xml");

// З рядка (для тестів)
string xml = "<root><item>Hello</item></root>";
XDocument doc = XDocument.Parse(xml);
```

### Навігація по структурі

```csharp
XDocument doc = XDocument.Load("library.xml");

// Кореневий елемент
XElement root = doc.Root; // <library>

// Всі прямі нащадки <book>
IEnumerable<XElement> books = root.Elements("book");

// Перший елемент <book>
XElement first = root.Element("book");

// Читання тексту елемента
string title = first.Element("title").Value; // "Майстер і Маргарита"

// Читання атрибута
string id    = first.Attribute("id").Value;  // "1"
string genre = (string)first.Attribute("genre"); // безпечний cast, null якщо нема
```

### Перебір усіх книг

```csharp
foreach (XElement book in doc.Root.Elements("book"))
{
    string title  = book.Element("title").Value;
    string author = book.Element("author").Value;
    int    year   = (int)book.Element("year"); // XElement → int через cast
    string id     = (string)book.Attribute("id");

    Console.WriteLine($"[{id}] {title} — {author} ({year})");
}
```

### LINQ-запити до XML

Оскільки `Elements()` повертає `IEnumerable<XElement>`, до нього застосовні всі LINQ-оператори:

```csharp
// Всі книги жанру "classic"
var classics = doc.Root
    .Elements("book")
    .Where(b => (string)b.Attribute("genre") == "classic")
    .Select(b => b.Element("title").Value)
    .ToList();

// Найновіша книга
XElement newest = doc.Root
    .Elements("book")
    .OrderByDescending(b => (int)b.Element("year"))
    .First();

// Середня ціна
double avgPrice = doc.Root
    .Elements("book")
    .Average(b => (double)b.Element("price"));
```

## Пошук у всьому дереві: Descendants

`Elements()` шукає лише прямих нащадків. `Descendants()` шукає **на всіх рівнях вкладеності**:

```xml
<catalog>
    <section name="fiction">
        <book><title>Дюна</title></book>
    </section>
    <section name="science">
        <book><title>Кобзар</title></book>
    </section>
</catalog>
```

```csharp
// Знайти всі <title> незалежно від рівня вкладеності
var allTitles = doc.Descendants("title")
                   .Select(e => e.Value)
                   .ToList();
// ["Дюна", "Кобзар"]
```

## XPath: запити до XML

**XPath** — мова запитів до XML-документів. Схожа на шлях у файловій системі.

```csharp
using System.Xml.XPath;

XDocument doc = XDocument.Load("library.xml");

// Знайти всі книги з атрибутом genre="fiction"
IEnumerable<XElement> fiction = doc.XPathSelectElements("//book[@genre='fiction']");

// Знайти заголовок книги з id=2
XElement title = doc.XPathSelectElement("//book[@id='2']/title");
Console.WriteLine(title?.Value); // "Кобзар"
```

Основні XPath-вирази:

| Вираз | Значення |
|---|---|
| `/library/book` | Прямі нащадки `book` у `library` |
| `//book` | Всі `book` на будь-якому рівні |
| `//book[@genre='fiction']` | Книги з атрибутом genre=fiction |
| `//book[year > 1900]` | Книги з роком > 1900 |
| `//book/title/text()` | Текст усіх заголовків |
| `count(//book)` | Кількість книг |

---

У наступному розділі розглянемо **запис та модифікацію** XML-документів.
