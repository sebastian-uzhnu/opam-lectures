---
sidebar_position: 2
---

# Операції з рядками

## Незмінність рядків (Immutability)

Важливо пам'ятати, що рядки в C# є **незмінними** (immutable). Це означає, що після створення об'єкта рядка його не
можна змінити. Будь-яка операція, яка "змінює" рядок, насправді створює новий об'єкт рядка в пам'яті.

```csharp
string s1 = "Hello";
string s2 = s1; 
s1 += " World"; // Створюється новий рядок "Hello World", s1 посилається на нього
// s2 все ще посилається на старий рядок "Hello"
```

## Довжина рядка

Властивість `Length` повертає кількість символів у рядку:

```csharp
string text = "C# Programming";
int length = text.Length; // 14
```

## Доступ до символів

До окремих символів рядка можна звертатися за індексом (як у масиві), але тільки для читання:

```csharp
string text = "Hello";
char first = text[0]; // 'H'
char last = text[text.Length - 1]; // 'o'

// text[0] = 'h'; // Помилка компіляції! Рядки незмінні.
```

## Перебір символів

Можна використовувати цикл `foreach` для перебору всіх символів рядка:

```csharp
string text = "Hello";
foreach (char c in text)
{
    Console.WriteLine(c);
}
```

## Конкатенація (Об'єднання)

Об'єднання рядків можна виконувати оператором `+` або методом `String.Concat`:

```csharp
string s1 = "Hello";
string s2 = "World";
string res1 = s1 + " " + s2;
string res2 = String.Concat(s1, " ", s2);
```

## Порівняння рядків

Для порівняння рядків не завжди достатньо `==`. Метод `Compare` та `Equals` дають більше контролю (наприклад,
ігнорування регістру).

```csharp
string a = "apple";
string b = "Apple";

bool isEqual = (a == b); // false
bool isSame = a.Equals(b, StringComparison.OrdinalIgnoreCase); // true

int result = String.Compare(a, b); // повертає < 0, 0 або > 0
```

## Пошук у рядку

* `Contains(str)`: чи містить підрядок
* `StartsWith(str)` / `EndsWith(str)`: чи починається/закінчується на підрядок
* `IndexOf(str)`: індекс першого входження (або -1)
* `LastIndexOf(str)`: індекс останнього входження

```csharp
string text = "Hello World";
bool hasWorld = text.Contains("World"); // true
int index = text.IndexOf("o"); // 4
```

## Виділення підрядків (Substring)

Метод `Substring` дозволяє отримати частину рядка:

```csharp
string text = "Hello World";
// Substring(startIndex, length)
string sub = text.Substring(6, 5); // "World"
// Substring(startIndex) - до кінця рядка
string tail = text.Substring(6); // "World"
```

## Розділення та об'єднання (Split та Join)

`Split` розбиває рядок на масив за роздільником, а `Join` об'єднує масив у рядок.

```csharp
string sentence = "C#,Java,Python,C++";
string[] langs = sentence.Split(','); 
// langs = ["C#", "Java", "Python", "C++"]

string newSentence = String.Join(" | ", langs);
// "C# | Java | Python | C++"
```

## Заміна та видалення (Replace, Remove, Trim)

```csharp
string text = "  Hello World  ";

// Видалення пробілів на початку і в кінці
string trimmed = text.Trim(); // "Hello World"

// Заміна
string replaced = text.Replace("World", "C#"); // "  Hello C#  "

// Видалення частини рядка (startIndex, count)
string removed = text.Remove(5); // "  Hel" (видаляє все починаючи з 5-го індексу)
```

## Перевірка на наявність підрядка

Метод `Contains()` перевіряє, чи містить рядок певний підрядок.

```csharp
string sentence = "The quick brown fox";
bool containsFox = sentence.Contains("fox");  // true
```

## Перевірка на порожність

Методи `IsNullOrEmpty()` та `IsNullOrWhiteSpace()` допомагають визначити, чи є рядок порожнім або складається лише з
пробілів.

```csharp
string empty = "";
bool isEmpty = string.IsNullOrEmpty(empty);  // true

string whiteSpace = "   ";
bool isOnlyWhiteSpace = string.IsNullOrWhiteSpace(whiteSpace);  // true
```

## Форматування рядків

Метод `String.Format()` дозволяє динамічно створювати рядки на основі шаблону.

```csharp
int value = 1234;
string formatted = string.Format("Value is {0:N0}", value);  // "Value is 1,234"
```

