---
sidebar_position: 3
---

# Операції над рядками

Клас `String` надає багато методів для обробки тексту.

## Конкатенація (Об'єднання)

Об'єднання рядків можна виконувати оператором `+` або методом `String.Concat`:

```csharp
string s1 = "Hello";
string s2 = "World";
string res1 = s1 + " " + s2;
string res2 = String.Concat(s1, " ", s2);
```

## Порівняння рядків

Для порівняння рядків не завжди достатньо `==`. Метод `Compare` та `Equals` дають більше контролю (наприклад, ігнорування регістру).

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
