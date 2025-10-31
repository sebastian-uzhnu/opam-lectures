# Обробка масивів

## Проходження через масиви (ітерація):

Для обходу всіх елементів масиву можна використовувати цикл `for`, `foreach` або методи з бібліотеки LINQ.

### Цикл `for`:

```csharp
int[] numbers = { 1, 2, 3, 4, 5 };

for (int i = 0; i < numbers.Length; i++)
{
    Console.WriteLine(numbers[i]);  // Виводить кожен елемент масиву
}
```

### Цикл `foreach`:

```csharp
int[] numbers = { 1, 2, 3, 4, 5 };

foreach (int number in numbers)
{
    Console.WriteLine(number);  // Виводить кожен елемент масиву
}
```

## Сортування масивів:

C# надає клас `Array` з методами для сортування масивів.

### Приклад сортування масиву:

```csharp
int[] numbers = { 5, 3, 1, 4, 2 };
Array.Sort(numbers);  // Сортує масив в порядку зростання

foreach (int number in numbers)
{
    Console.WriteLine(number);  // Виведе 1, 2, 3, 4, 5
}
```

### Зворотний порядок масиву:

Метод `Array.Reverse` дозволяє змінити порядок елементів масиву на зворотний.

### Приклад зворотного порядку:

```csharp
int[] numbers = { 1, 2, 3, 4, 5 };
Array.Reverse(numbers);  // Розвертає масив

foreach (int number in numbers)
{
    Console.WriteLine(number);  // Виведе 5, 4, 3, 2, 1
}
```
