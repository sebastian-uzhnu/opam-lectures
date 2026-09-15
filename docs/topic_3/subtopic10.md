---
sidebar_label: Перелічувані типи (enum)
sidebar_position: 11
---

# Перелічувані типи (`enum`)

Уявіть, що програма зберігає стан замовлення. Станів рівно чотири: нове, оплачене,
відправлене, доставлене. Як це записати?

Найочевидніший спосіб виявляється й найгіршим:

```csharp
int status = 2;    // а що таке 2?
```

Через тиждень ніхто — включно з автором — не згадає, `2` це «відправлене» чи
«оплачене». Гірше того, ніщо не заважає записати `status = 17`, і програма
спокійно це прийме.

Спроба з рядками не краща:

```csharp
string status = "Відправлено";

if (status == "відправлено")   // ❌ не спрацює — інший регістр
```

Тут помилку не помітить ні компілятор, ні ви — до першого запуску.

Розв'язання — **перелічуваний тип**.

## Оголошення enum

**`enum`** — це тип, значення якого обмежене наперед заданим переліком іменованих
констант.

```csharp
enum OrderStatus
{
    New,
    Paid,
    Shipped,
    Delivered
}
```

Тепер стан замовлення має власний тип:

```csharp
OrderStatus status = OrderStatus.Shipped;

Console.WriteLine(status);   // Shipped
```

Три речі змінилися на краще:

1. Код **читається** — `OrderStatus.Shipped` не потребує пояснень.
2. Компілятор **не дозволить** присвоїти щось стороннє:

   ```csharp
   status = 17;                    // ❌ помилка компіляції
   status = OrderStatus.Paid;      // ✅
   ```

3. Середовище розробки **підказує** доступні значення після крапки.

:::tip
Щоразу, коли у вас у коді з'являється число або рядок із фіксованого набору
варіантів — день тижня, рівень складності, стать, тип фігури, режим роботи —
це кандидат на `enum`.
:::

## Що всередині

Насправді `enum` — це цілі числа з іменами. За замовчуванням нумерація
починається з нуля:

```csharp
enum OrderStatus
{
    New,        // 0
    Paid,       // 1
    Shipped,    // 2
    Delivered   // 3
}

Console.WriteLine((int)OrderStatus.Shipped);   // 2
```

Значення можна задати явно:

```csharp
enum StatusCode
{
    Ok = 200,
    NotFound = 404,
    ServerError = 500
}
```

Або задати лише перше — решта продовжать відлік:

```csharp
enum Month
{
    January = 1,   // 1
    February,      // 2
    March          // 3
}
```

:::note[Чому нумерація з нуля має значення]
Значення за замовчуванням для `enum` — це `0`, навіть якщо такого варіанта
у вас немає:

```csharp
enum Level { Low = 1, Medium = 2, High = 3 }

Level level = default;
Console.WriteLine(level);        // 0 — виводиться саме число, бо імені немає
Console.WriteLine((int)level);   // 0
```

Тому першим елементом корисно робити «невизначений» стан:

```csharp
enum Level { None = 0, Low, Medium, High }
```
:::

## Enum у розгалуженнях

Найчастіше `enum` використовують у `switch`:

```csharp
OrderStatus status = OrderStatus.Paid;

switch (status)
{
    case OrderStatus.New:
        Console.WriteLine("Очікує оплати");
        break;
    case OrderStatus.Paid:
        Console.WriteLine("Готується до відправлення");
        break;
    case OrderStatus.Shipped:
        Console.WriteLine("У дорозі");
        break;
    case OrderStatus.Delivered:
        Console.WriteLine("Доставлено");
        break;
}
```

:::tip[Перевага, яку дає компілятор]
Якщо ви додасте в `enum` новий стан — скажімо, `Cancelled` — сучасні середовища
розробки попередять, що в `switch` цей випадок не оброблено. З числами чи
рядками такої підказки не буде: програма мовчки не робитиме нічого.
:::

## Перетворення

### Enum ↔ число

```csharp
OrderStatus status = OrderStatus.Shipped;

int number = (int)status;              // 2 — enum у число
OrderStatus back = (OrderStatus)2;     // Shipped — число в enum
```

:::warning
Приведення числа до `enum` **не перевіряється**:

```csharp
OrderStatus wrong = (OrderStatus)99;
Console.WriteLine(wrong);    // 99 — неіснуючий стан!
```

Компілятор це пропустить. Якщо число приходить ззовні (з файлу, з бази даних,
від користувача), перевіряйте його явно:

```csharp
if (Enum.IsDefined(typeof(OrderStatus), number))
{
    OrderStatus safe = (OrderStatus)number;
}
```
:::

### Enum ↔ рядок

```csharp
OrderStatus status = OrderStatus.Paid;

string text = status.ToString();               // "Paid"

// Надійний розбір рядка
if (Enum.TryParse("Shipped", out OrderStatus parsed))
{
    Console.WriteLine(parsed);                 // Shipped
}
```

Перебрати всі значення:

```csharp
foreach (OrderStatus s in Enum.GetValues(typeof(OrderStatus)))
{
    Console.WriteLine($"{(int)s} — {s}");
}
```

```
0 — New
1 — Paid
2 — Shipped
3 — Delivered
```

## Enum як набір прапорців

Іноді потрібно зберігати **кілька** варіантів одночасно: налаштування, права
доступу, увімкнені режими. Для цього значенням присвоюють степені двійки
й додають атрибут `[Flags]`:

```csharp
[Flags]
enum Permissions
{
    None    = 0,
    Read    = 1,    // 0001
    Write   = 2,    // 0010
    Delete  = 4,    // 0100
    Execute = 8     // 1000
}
```

Тепер кілька значень поєднуються побітовим `|`:

```csharp
Permissions user = Permissions.Read | Permissions.Write;

Console.WriteLine(user);                        // Read, Write

// Перевірити наявність права
if (user.HasFlag(Permissions.Write))
{
    Console.WriteLine("Можна редагувати");
}

// Додати право
user |= Permissions.Delete;

// Забрати право
user &= ~Permissions.Write;
```

:::note
Це те саме застосування побітових операцій, яке розглядалося в підрозділі
про них: кожен біт числа — окремий прапорець. Степені двійки потрібні саме
для того, щоб кожне значення займало власний біт і не перетиналося з іншими.
:::

## Практичний приклад

Програма визначає вартість квитка залежно від категорії пасажира:

```csharp
enum PassengerType
{
    Adult,
    Student,
    Child,
    Pensioner
}

decimal basePrice = 200m;

PassengerType type = PassengerType.Student;

decimal discount = type switch
{
    PassengerType.Adult     => 0m,
    PassengerType.Student   => 0.5m,
    PassengerType.Child     => 0.75m,
    PassengerType.Pensioner => 0.6m,
    _                       => 0m
};

decimal price = basePrice * (1 - discount);

Console.WriteLine($"Тип: {type}, до сплати: {price:F2} грн");
// Тип: Student, до сплати: 100.00 грн
```

Порівняйте з версією на числах: `if (type == 1) discount = 0.5m;` — і спробуйте
через місяць згадати, хто такий `1`.

## Де оголошувати enum

`enum` оголошують **поза** методом — на рівні простору імен або класу:

```csharp
enum Season { Winter, Spring, Summer, Autumn }

class Program
{
    static void Main()
    {
        Season now = Season.Autumn;
        Console.WriteLine(now);
    }
}
```

## Висновок

- **`enum`** — тип, значення якого обмежене наперед заданим переліком
  іменованих констант.
- Замінює «магічні» числа й рядки: код читається, а компілятор не дозволяє
  присвоїти стороннє значення.
- Усередині це **цілі числа**; нумерація за замовчуванням починається з `0`,
  значення можна задати явно.
- Значення за замовчуванням — `0`, тому першим варіантом корисно робити
  `None` або інший «невизначений» стан.
- Приведення числа до `enum` **не перевіряється** — для зовнішніх даних
  використовують `Enum.IsDefined` або `Enum.TryParse`.
- Атрибут **`[Flags]`** зі степенями двійки дозволяє зберігати кілька
  значень одночасно й перевіряти їх через `HasFlag`.
