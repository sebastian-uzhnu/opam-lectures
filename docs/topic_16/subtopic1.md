---
sidebar_position: 2
---

# Перевизначення методів: virtual, override, new, sealed

Наслідування дало нам можливість не дублювати код. Але поки що нащадок міг
лише **додавати** щось своє до базового класу. Наступний крок — навчити
нащадка **змінювати** поведінку успадкованого методу. Це називається
**перевизначенням** (overriding), і саме воно робить наслідування по-справжньому
потужним.

## Проблема: спільний метод, різна поведінка

Повернімося до нашої ієрархії людей у коледжі. Метод `Introduce()` у базовому
класі виводить ім'я та вік:

```csharp
class Person
{
    public string Name { get; }
    public int Age { get; }

    public Person(string name, int age)
    {
        Name = name;
        Age = age;
    }

    public void Introduce()
    {
        Console.WriteLine($"Мене звати {Name}, мені {Age} років.");
    }
}
```

Це працює для всіх, але виглядає бідно. Студент мав би ще назвати групу,
викладач — предмет, адміністратор — відділ. Тобто метод називається однаково,
викликається однаково, а працювати має по-різному залежно від типу об'єкта.

Найгірше, що можна зробити, — написати в базовому класі перевірку типу:

```csharp
// ЖАХЛИВИЙ КОД, ніколи так не робіть
public void Introduce()
{
    if (this is Student)
        Console.WriteLine("Я студент...");
    else if (this is Teacher)
        Console.WriteLine("Я викладач...");
    else
        Console.WriteLine("Я людина...");
}
```

Тут базовий клас має знати про всіх своїх нащадків. Додали нового нащадка —
йдіть правити базовий клас. Через рік цей `if` матиме двадцять гілок.
C# пропонує на порядок кращий інструмент.

## `virtual` і `override`

Два ключові слова, які працюють у парі:

- **virtual** пишеться в **базовому** класі. Означає: «цей метод дозволено
  перевизначати нащадкам».
- **override** пишеться в **похідному** класі. Означає: «я замінюю реалізацію
  віртуального методу батька своєю».

Перепишімо приклад:

```csharp
class Person
{
    public string Name { get; }
    public int Age { get; }

    public Person(string name, int age)
    {
        Name = name;
        Age = age;
    }

    // Дозволяємо нащадкам змінювати цей метод
    public virtual void Introduce()
    {
        Console.WriteLine($"Мене звати {Name}, мені {Age} років.");
    }
}

class Student : Person
{
    public string Group { get; }

    public Student(string name, int age, string group) : base(name, age)
    {
        Group = group;
    }

    public override void Introduce()
    {
        Console.WriteLine($"Я студент {Name}, група {Group}.");
    }
}

class Teacher : Person
{
    public string Subject { get; }

    public Teacher(string name, int age, string subject) : base(name, age)
    {
        Subject = subject;
    }

    public override void Introduce()
    {
        Console.WriteLine($"Я викладач {Name}, читаю «{Subject}».");
    }
}

class Admin : Person
{
    public string Department { get; }

    public Admin(string name, int age, string department) : base(name, age)
    {
        Department = department;
    }

    public override void Introduce()
    {
        Console.WriteLine($"Я адміністратор {Name}, відділ «{Department}».");
    }
}
```

І тепер найцікавіше. Складімо всіх в один масив **базового** типу:

```csharp
Person[] people =
[
    new Student("Олена Кравчук", 17, "ПЗ-21"),
    new Teacher("Ігор Мельник", 45, "Програмування"),
    new Admin("Софія Бондаренко", 38, "Навчальна частина"),
    new Person("Максим Гриценко", 30)
];

foreach (var person in people)
{
    person.Introduce();
}
```

**Вивід:**

```
Я студент Олена Кравчук, група ПЗ-21.
Я викладач Ігор Мельник, читаю «Програмування».
Я адміністратор Софія Бондаренко, відділ «Навчальна частина».
Мене звати Максим Гриценко, мені 30 років.
```

Зупиніться на секунду й оцініть, що щойно сталося. Змінна `person` має тип
`Person`. Компілятор про студентів і викладачів у цьому циклі нічого не знає.
Але викликався **правильний** метод для кожного об'єкта. Це і є поліморфізм,
йому присвячено наступний підрозділ.

:::note
Синтаксис `Person[] people = [ ... ]` — це **collection expression**, нова
можливість C# 12. Раніше писали `new Person[] { ... }`. Обидва варіанти
працюють, новий коротший.
:::

## Правила `override`

Перевизначений метод має **точно** збігатися з базовим:

| Що має збігатися | Пояснення |
|---|---|
| Назва | посимвольно, з урахуванням регістру |
| Тип повернення | `void` перевизначається `void`, `double` — `double` |
| Список параметрів | кількість, типи й порядок |
| Модифікатор доступу | `public` перевизначається тільки `public` |

Якщо щось не збігається, компілятор не знайде метод для перевизначення
й видасть помилку. Найчастіша причина — випадково змінений список параметрів:
тоді ви не перевизначили метод, а спробували перевизначити неіснуючий.

:::tip[Порада]
Не пишіть `override` руками. У Visual Studio наберіть у похідному класі
слово `override`, поставте пробіл — і IDE покаже список усіх віртуальних
методів, які можна перевизначити. Виберіть потрібний, і сигнатура
згенерується сама, без жодного шансу помилитися.
:::

## Пастка перша: забули `virtual`

Приберімо `virtual` у базовому класі й подивімося, що скаже компілятор:

```csharp
class Person
{
    public void Introduce()          // virtual прибрали
    {
        Console.WriteLine($"Мене звати {Name}.");
    }
}

class Student : Person
{
    public override void Introduce() // ПОМИЛКА
    {
        Console.WriteLine($"Я студент {Name}.");
    }
}
```

**Помилка компіляції:**

```
CS0506: 'Student.Introduce()': cannot override inherited member
'Person.Introduce()' because it is not marked virtual, abstract, or override
```

Українською: «не можна перевизначити метод, який не позначено як `virtual`».

Це хороша помилка, бо вона видима. Програма просто не збереться, ви прочитаєте
текст і додасте `virtual`. Значно гірша пастка — наступна.

## Пастка друга: `new` замість `override`

А що, як прибрати не `virtual`, а `override`? Компілятор видасть **попередження**
(не помилку!):

```
CS0114: 'Student.Introduce()' hides inherited member 'Person.Introduce()'.
To make the current member override that implementation, add the override
keyword. Otherwise add the new keyword.
```

Тобто компілятор каже: «ти оголосив у нащадку метод з такою самою назвою.
Якщо хотів перевизначити — пиши `override`. Якщо хотів **приховати** —
пиши `new`». Приховування — це третій варіант, і поводиться він зовсім інакше.

**Приховування** (hiding, shadowing) означає: у похідному класі оголошено
**новий, окремий** метод, який просто має таку саму назву. Зв'язку з базовим
методом у нього немає.

Порівняймо два варіанти на **абсолютно однаковому** коді використання.

### Варіант A: `virtual` + `override`

```csharp
class Person
{
    public virtual void Introduce()
    {
        Console.WriteLine("Я людина");
    }
}

class Student : Person
{
    public override void Introduce()
    {
        Console.WriteLine("Я студент");
    }
}
```

### Варіант B: `new`

```csharp
class Person
{
    public virtual void Introduce()
    {
        Console.WriteLine("Я людина");
    }
}

class Student : Person
{
    public new void Introduce()      // приховуємо, а не перевизначаємо
    {
        Console.WriteLine("Я студент");
    }
}
```

### Один і той самий код використання

```csharp
Student student = new Student();
Person person = new Student();      // той самий об'єкт, інший тип змінної

Console.WriteLine("Через змінну типу Student:");
student.Introduce();

Console.WriteLine("Через змінну типу Person:");
person.Introduce();
```

**Вивід для варіанта A (`override`):**

```
Через змінну типу Student:
Я студент
Через змінну типу Person:
Я студент
```

**Вивід для варіанта B (`new`):**

```
Через змінну типу Student:
Я студент
Через змінну типу Person:
Я людина        ← ось вона, пастка
```

Другий рядок відрізняється. Об'єкт в обох випадках один і той самий —
`Student`. Але з `new` виклик визначається **типом змінної**, а не типом
об'єкта.

Схематично:

```
       override                              new
  ┌────────────────────┐           ┌────────────────────┐
  │ Person p = Student │           │ Person p = Student │
  └─────────┬──────────┘           └─────────┬──────────┘
            │                                │
   дивимось на ОБ'ЄКТ                дивимось на ЗМІННУ
            │                                │
            ▼                                ▼
     Student.Introduce()             Person.Introduce()
        "Я студент"                     "Я людина"
```

:::danger[Часта помилка]
Це найпопулярніше екзаменаційне питання з теми і одна з найнеприємніших
помилок у реальному коді. Ви написали `new` (або просто забули `override`,
проігнорувавши попередження), клас працює правильно, поки ви звертаєтеся
до нього напряму. А потім хтось кладе ваші об'єкти в `List<Person>` —
і поведінка мовчки змінюється. Жодної помилки, жодного винятку, просто
неправильний результат.

Висновок: **завжди читайте попередження компілятора**. CS0114 у 99 випадках
зі 100 означає, що ви забули `override`.
:::

### Коли `new` усе-таки потрібен

Чесно кажучи, майже ніколи. Єдиний реальний сценарій: ви користуєтеся чужою
бібліотекою, у якій метод **не** віртуальний, а вам конче треба своя версія
з такою самою назвою. Тоді `new` — єдиний вихід, і його треба супроводжувати
коментарем, чому так.

## Таблиця: `virtual` + `override` проти `new`

| Критерій | `virtual` + `override` | `new` (приховування) |
|---|---|---|
| Що відбувається | заміна реалізації | оголошення окремого методу |
| Чим визначається виклик | типом **об'єкта** | типом **змінної** |
| Коли вирішується | під час виконання (пізнє зв'язування) | під час компіляції |
| Чи потрібен `virtual` у базі | так, обов'язково | ні |
| Чи працює поліморфізм | так | ні |
| Доступ до базової версії | `base.Method()` | приведення до базового типу |
| Як часто треба | постійно | майже ніколи |

## `sealed override`: зупинити перевизначення

Уявіть трирівневу ієрархію: `Person` → `Student` → `GraduateStudent`.
Метод `Introduce` віртуальний, `Student` його перевизначив. Чи може
`GraduateStudent` перевизначити його ще раз? Так — `override` залишає метод
віртуальним і далі вниз по ланцюжку.

Якщо ви хочете це зупинити, додайте **sealed**:

```csharp
class Person
{
    public virtual void Introduce()
        => Console.WriteLine("Я людина");
}

class Student : Person
{
    // перевизначаємо і забороняємо перевизначати далі
    public sealed override void Introduce()
        => Console.WriteLine("Я студент");
}

class GraduateStudent : Student
{
    // public override void Introduce()   // ПОМИЛКА CS0239:
    //     => Console.WriteLine("Я аспірант");
    // cannot override inherited member because it is sealed
}
```

Не плутайте два застосування `sealed`:

| Запис | Що забороняє |
|---|---|
| `sealed class Admin` | успадковувати від класу взагалі |
| `sealed override void M()` | перевизначати цей конкретний метод далі вниз |

## Перевизначення `ToString()` — найкорисніше на практиці

Пам'ятаєте, що кожен клас успадковує від `object` метод `ToString()`?
Його реалізація за замовчуванням виводить назву типу, і це нікому не потрібно.

```csharp
class Student
{
    public string Name { get; set; } = "";
    public string Group { get; set; } = "";
    public double AverageGrade { get; set; }
}

var s = new Student { Name = "Олена Кравчук", Group = "ПЗ-21", AverageGrade = 4.7 };
Console.WriteLine(s);
```

**Вивід:**

```
Student
```

Не дуже інформативно. Перевизначмо:

```csharp
class Student
{
    public string Name { get; set; } = "";
    public string Group { get; set; } = "";
    public double AverageGrade { get; set; }

    public override string ToString()
    {
        return $"{Name} ({Group}), середній бал {AverageGrade:F2}";
    }
}
```

Той самий `Console.WriteLine(s)` тепер дає:

```
Олена Кравчук (ПЗ-21), середній бал 4,70
```

Зверніть увагу: ми написали `Console.WriteLine(s)`, а не
`Console.WriteLine(s.ToString())`. `WriteLine` викликає `ToString()` сам —
так само роблять інтерполяція рядків, конкатенація через `+`, вікно
Debug у Visual Studio і майже кожна бібліотека, яка щось виводить.
Одне перевизначення робить об'єкт зручним усюди.

```csharp
Console.WriteLine($"Найкращий студент: {s}");        // теж працює
string report = "Студент: " + s;                     // і тут
Console.WriteLine(string.Join("\n", students));      // і в списку
```

:::tip[Порада]
Перевизначайте `ToString()` у **кожному** класі, який ви пишете. Це п'ять
хвилин роботи, які потім економлять години налагодження: у вікні
«Локальні змінні» ви бачитимете «Олена Кравчук (ПЗ-21)» замість
безликого `Student`.

Правила хорошого `ToString()`: один рядок, без переносів, без звернень
до бази даних чи файлів, ніколи не кидає винятків.
:::

### `ToString()` в ієрархії

`ToString()` віртуальний (він оголошений як `virtual` в `object`), тому
його можна перевизначати на кожному рівні й користуватися `base`:

```csharp
class Person
{
    public string Name { get; init; } = "";
    public int Age { get; init; }

    public override string ToString() => $"{Name}, {Age} р.";
}

class Student : Person
{
    public string Group { get; init; } = "";

    public override string ToString() => $"{base.ToString()}, група {Group}";
}

class GraduateStudent : Student
{
    public string Topic { get; init; } = "";

    public override string ToString()
        => $"{base.ToString()}, тема «{Topic}»";
}
```

```csharp
var grad = new GraduateStudent
{
    Name = "Ігор Мельник",
    Age = 24,
    Group = "ПЗ-м1",
    Topic = "Аналіз алгоритмів"
};

Console.WriteLine(grad);
```

**Вивід:**

```
Ігор Мельник, 24 р., група ПЗ-м1, тема «Аналіз алгоритмів»
```

Кожен рівень додає свою частину до того, що вже сформував батько. Ніякого
дублювання, ніякого копіювання рядків форматування.

## Виклик `base.Method()` усередині `override`

Приклад вище показав головний прийом: **розширення** поведінки замість
повної заміни. Схема така:

```csharp
public override void Метод()
{
    base.Метод();       // спочатку все, що вміє батько
    // ... потім наше додаткове
}
```

Порядок можна й змінити — інколи потрібно спершу зробити своє, а потім
викликати базове. Або викликати базове десь усередині. Або не викликати
взагалі, якщо ви повністю замінюєте логіку.

Життєвий приклад — логування збереження:

```csharp
class Document
{
    public string Title { get; init; } = "";

    public virtual void Save()
    {
        Console.WriteLine($"Записую «{Title}» на диск...");
    }
}

class EncryptedDocument : Document
{
    public virtual void Encrypt() => Console.WriteLine("Шифрую вміст...");

    public override void Save()
    {
        Encrypt();          // спочатку наше
        base.Save();        // потім звичайне збереження
        Console.WriteLine("Готово: файл зашифровано і збережено.");
    }
}
```

```csharp
var doc = new EncryptedDocument { Title = "Курсова робота" };
doc.Save();
```

**Вивід:**

```
Шифрую вміст...
Записую «Курсова робота» на диск...
Готово: файл зашифровано і збережено.
```

:::warning[Обережно]
`base` працює лише на **один рівень угору**. У класі `GraduateStudent`
запис `base.ToString()` викликає версію зі `Student`, а не з `Person`.
Дістатися «через голову» батька до дідуся не можна — і це правильно:
батько має право вирішувати, як саме він користується реалізацією предка.
:::

## Перевизначення властивостей

Властивості перевизначаються так само, як методи, — це логічно, адже
властивість під капотом складається з методів `get` і `set`.

```csharp
class Employee
{
    public string Name { get; init; } = "";
    public decimal BaseSalary { get; init; }

    // Віртуальна властивість тільки для читання
    public virtual decimal Salary => BaseSalary;

    public virtual string Position => "Співробітник";
}

class Manager : Employee
{
    public decimal Bonus { get; init; }

    // Менеджер отримує оклад плюс бонус
    public override decimal Salary => base.Salary + Bonus;

    public override string Position => "Менеджер";
}
```

```csharp
Employee[] staff =
[
    new Employee { Name = "Олена", BaseSalary = 25000m },
    new Manager  { Name = "Ігор", BaseSalary = 30000m, Bonus = 8000m }
];

foreach (var e in staff)
{
    Console.WriteLine($"{e.Name,-8} {e.Position,-14} {e.Salary,10:N2} грн");
}
```

**Вивід:**

```
Олена    Співробітник     25 000,00 грн
Ігор     Менеджер         38 000,00 грн
```

:::note
Автоматичну властивість (`public virtual string Name { get; set; }`) теж
можна позначити `virtual`, але перевизначати її має сенс тільки тоді, коли
ви пишете власну логіку в `get` або `set`. Якщо нащадок просто напише
`public override string Name { get; set; }`, він отримає **власне** окреме
поле-бекінг, і значення роздвояться. Це рідкісне, але дуже неприємне джерело
багів.
:::

## Типові помилки

**1. Ігнорувати попередження CS0114.**
Жовта хвиляста лінія під назвою методу — це не «дрібниця, потім поправлю».
Це повідомлення «ти забув `override`, і твій поліморфізм не працює».

**2. Писати `new` там, де треба `override`.**
Якщо не можете за десять секунд пояснити, навіщо вам приховування, —
вам потрібен `override`.

**3. Забути `virtual` у базовому класі й «розв'язати» це через `new`.**
Симптом виправлено, хвороба залишилася. Правильно — додати `virtual` у базу.

**4. Перевизначити метод і не викликати `base`, коли він потрібен.**
Класичний випадок: базовий конструктор чи базовий `Save()` робить щось
обов'язкове (перевірку, реєстрацію), а нащадок його «забув». Перед тим як
не викликати `base`, переконайтеся, що ви справді замінюєте, а не розширюєте.

**5. Тримати важку логіку в `ToString()`.**
Цей метод викликається у налагоджувачі автоматично, іноді десятки разів
на секунду. Звернення до бази даних усередині нього перетворить налагодження
на муку.
