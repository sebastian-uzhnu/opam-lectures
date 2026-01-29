# Інтерфейси

## Оголошення інтерфейсу

```csharp
interface IFlyable
{
    void Fly();
}
```

## Реалізація інтерфейсу

```csharp
class Bird : IFlyable
{
    public void Fly()
    {
        Console.WriteLine("Bird is flying");
    }
}
```

## Інтерфейс з властивостями

```csharp
interface IWorker
{
    string Position { get; }
    void Work();
}
```

## Реалізація кількох інтерфейсів

```csharp
interface IPrintable
{
    void Print();
}

interface IScannable
{
    void Scan();
}

class PrinterScanner : IPrintable, IScannable
{
    public void Print()
    {
        Console.WriteLine("Printing...");
    }

    public void Scan()
    {
        Console.WriteLine("Scanning...");
    }
}
```

# Поєднання абстрактного класу та інтерфейсу

```csharp
abstract class Shape
{
    public abstract double Area();
}

interface IDrawable
{
    void Draw();
}

class Circle : Shape, IDrawable
{
    public double Radius { get; set; }

    public override double Area()
    {
        return Math.PI * Radius * Radius;
    }

    public void Draw()
    {
        Console.WriteLine("Drawing circle");
    }
}
```
