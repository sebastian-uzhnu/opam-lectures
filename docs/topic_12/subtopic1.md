# Абстрактні класи

## Поняття абстрактного класу

Абстрактний клас — це клас, екземпляри якого не можна створювати безпосередньо.
Він використовується як базовий клас для інших класів.

```csharp
abstract class Animal
{
    public string Name { get; set; }
}
```

## Абстрактні методи

```csharp
abstract class Animal
{
    public abstract void MakeSound();
}
```

## Реалізація в похідних класах

```csharp
class Dog : Animal
{
    public override void MakeSound()
    {
        Console.WriteLine("Woof!");
    }
}

class Cat : Animal
{
    public override void MakeSound()
    {
        Console.WriteLine("Meow!");
    }
}
```

## Абстрактний клас з реалізованими методами

```csharp
abstract class Vehicle
{
    public void Start()
    {
        Console.WriteLine("Vehicle started");
    }

    public abstract void Move();
}
```
