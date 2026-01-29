# Стандартні інтерфейси .NET

## IComparable

Використовується для визначення порядку сортування об'єктів.

```csharp
class Student : IComparable<Student>
{
    public string Name { get; set; }
    public int Grade { get; set; }

    public int CompareTo(Student other)
    {
        if (other == null) return 1;
        return Grade.CompareTo(other.Grade);
    }
}
```

## IDisposable

Використовується для звільнення некерованих ресурсів.

```csharp
class FileManager : IDisposable
{
    private bool disposed = false;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            if (disposing)
            {
                // Звільнення керованих ресурсів
                Console.WriteLine("Managed resources released");
            }
            // Звільнення некерованих ресурсів
            disposed = true;
        }
    }
}
```

## IEnumerable

Дозволяє ітерувати по колекції за допомогою `foreach`.

```csharp
using System.Collections;

class Team : IEnumerable
{
    private string[] members = { "Alice", "Bob", "Charlie" };

    public IEnumerator GetEnumerator()
    {
        return members.GetEnumerator();
    }
}
```

## IEquatable

Визначає метод для перевірки рівності значень.

```csharp
class Point : IEquatable<Point>
{
    public int X { get; set; }
    public int Y { get; set; }

    public bool Equals(Point other)
    {
        if (other == null) return false;
        return (this.X == other.X) && (this.Y == other.Y);
    }
}
```

## ICloneable

Підтримує клонування об'єкта (зазвичай поверхневе копіювання).

```csharp
class Robot : ICloneable
{
    public string Model { get; set; }

    public object Clone()
    {
        return this.MemberwiseClone();
    }
}
```
