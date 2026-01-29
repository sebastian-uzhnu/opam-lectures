---
sidebar_position: 3
---

# Практичні завдання та приклади

Цей розділ містить практичні приклади коду з поясненнями для закріплення теми.

## Платіжна система (онлайн-магазин)

```csharp
abstract class PaymentMethod
{
    public abstract void Pay(double amount);
}

class CreditCardPayment : PaymentMethod
{
    public override void Pay(double amount)
    {
        Console.WriteLine($"Оплата картою: {amount} грн");
    }
}

class PayPalPayment : PaymentMethod
{
    public override void Pay(double amount)
    {
        Console.WriteLine($"Оплата через PayPal: {amount} грн");
    }
}

class CryptoPayment : PaymentMethod
{
    public override void Pay(double amount)
    {
        Console.WriteLine($"Оплата криптовалютою: {amount} грн");
    }
}
```

Питання: - Що зміниться, якщо додати новий тип оплати? - Чи потрібно
змінювати існуючі класи?

---

## Гра: персонажі

```csharp
abstract class Character
{
    public string Name;
    public abstract void Attack();
}

class Warrior : Character
{
    public override void Attack() => Console.WriteLine("Удар мечем");
}

class Mage : Character
{
    public override void Attack() => Console.WriteLine("Вогняна куля");
}

class Archer : Character
{
    public override void Attack() => Console.WriteLine("Постріл з лука");
}
```

Питання: - Навіщо використовувати базовий тип Character? - Як додати
нового персонажа?

---

## Повідомлення

```csharp
abstract class MessageSender
{
    public abstract void Send(string message);
}

class EmailSender : MessageSender
{
    public override void Send(string message)
    {
        Console.WriteLine($"Email: {message}");
    }
}

class SmsSender : MessageSender
{
    public override void Send(string message)
    {
        Console.WriteLine($"SMS: {message}");
    }
}
```

---

## Транспорт

```csharp
abstract class Transport
{
    public abstract double GetFuelConsumption();
}

class Car : Transport
{
    public override double GetFuelConsumption() => 8.5;
}

class Bus : Transport
{
    public override double GetFuelConsumption() => 25;
}

class ElectricScooter : Transport
{
    public override double GetFuelConsumption() => 0;
}
```

---

## Логування

```csharp
abstract class Logger
{
    public abstract void Log(string text);
}

class ConsoleLogger : Logger
{
    public override void Log(string text)
    {
        Console.WriteLine(text);
    }
}

class FileLogger : Logger
{
    public override void Log(string text)
    {
        Console.WriteLine("Запис у файл: " + text);
    }
}
```

---

## Статичний поліморфізм (перевантаження)

```csharp
class Printer
{
    public void Print(string text)
    {
        Console.WriteLine(text);
    }

    public void Print(int number)
    {
        Console.WriteLine(number);
    }

    public void Print(string text, int count)
    {
        for(int i=0;i<count;i++)
            Console.WriteLine(text);
    }
}
```

---

# Контрольні запитання

1. Що таке наслідування?
2. Чим відрізняється базовий клас від похідного?
3. Для чого використовується ключове слово virtual?
4. Коли застосовується override?
5. Що таке поліморфізм?
6. Чим відрізняється динамічний та статичний поліморфізм?
7. Наведіть приклад перевантаження методу.
8. Що означає ключове слово sealed?
9. Чому поліморфізм зменшує кількість умовних операторів?
10. У яких випадках краще використовувати абстрактний клас?

---

# Тестові запитання

1. Яке ключове слово дозволяє перевизначення методу?  
   A) static  
   B) sealed  
   C) virtual  
   D) private

2. Яке слово використовується в похідному класі?  
   A) new  
   B) override  
   C) base  
   D) this

3. Який тип поліморфізму використовує перевантаження методів?  
   A) Динамічний  
   B) Інтерфейсний  
   C) Статичний  
   D) Абстрактний

4. Чи можна створити об'єкт абстрактного класу?  
   A) Так  
   B) Ні

5. Який модифікатор доступу дозволяє доступ у похідних класах?  
   A) private  
   B) protected  
   C) sealed  
   D) const
