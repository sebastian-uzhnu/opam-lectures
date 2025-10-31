---
sidebar_label: Приклади використання циклів у C#
---
# Приклади використання циклів у C#

Цикли дозволяють повторювати певний набір дій. У C# найчастіше використовуються: **for**, **while**, **do...while**, **foreach**.  
Нижче наведено приклади використання для кожного типу.

---

## Приклади циклу for

### 1. Обчислення суми чисел від 1 до 10

```
int sum = 0;
for (int i = 1; i <= 10; i++)
{
    sum += i;
}
Console.WriteLine("Сума чисел: " + sum);
```

### 2. Обчислення факторіалу числа

```
int n = 5;
int fact = 1;
for (int i = 1; i <= n; i++)
{
    fact *= i;
}
Console.WriteLine("Факторіал: " + fact);
```

### 3. Виведення парних чисел

```
for (int i = 2; i <= 10; i += 2)
{
    Console.WriteLine(i);
}
```

### 4. Обчислення середнього арифметичного

```
int[] numbers = {1, 2, 3, 4, 5};
int sum = 0;
for (int i = 0; i < numbers.Length; i++)
{
    sum += numbers[i];
}
Console.WriteLine("Середнє: " + (sum / numbers.Length));
```

### 5. Зворотний відлік

```
for (int i = 5; i >= 1; i--)
{
    Console.WriteLine("Лічильник: " + i);
}
```

---

## Приклади циклу while

### 1. Підрахунок суми чисел, поки не досягнемо 100

```
int sum = 0;
int i = 1;
while (sum < 100)
{
    sum += i;
    i++;
}
Console.WriteLine("Сума: " + sum);
```

### 2. Знаходження першого числа, кратного 7

```
int number = 1;
while (number % 7 != 0)
{
    number++;
}
Console.WriteLine("Перше кратне 7: " + number);
```

### 3. Виведення чисел до введеного користувачем

```
int limit = 5;
int counter = 1;
while (counter <= limit)
{
    Console.WriteLine(counter);
    counter++;
}
```

### 4. Зворотний відлік до нуля

```
int n = 5;
while (n >= 0)
{
    Console.WriteLine(n);
    n--;
}
```

### 5. Сума елементів масиву

```
int[] nums = {2, 4, 6, 8};
int index = 0;
int sum = 0;
while (index < nums.Length)
{
    sum += nums[index];
    index++;
}
Console.WriteLine("Сума: " + sum);
```

---

## Приклади циклу do...while

### 1. Виведення чисел від 1 до 5

```
int x = 1;
do
{
    Console.WriteLine(x);
    x++;
}
while (x <= 5);
```

### 2. Запит користувача поки не введе правильний пароль

```
string password;
do
{
    Console.Write("Введіть пароль: ");
    password = Console.ReadLine();
}
while (password != "1234");
Console.WriteLine("Доступ дозволено!");
```

### 3. Обчислення добутку чисел

```
int product = 1;
int num = 1;
do
{
    product *= num;
    num++;
}
while (num <= 5);
Console.WriteLine("Добуток: " + product);
```

### 4. Введення чисел, поки не буде введено 0

```
int value;
do
{
    Console.Write("Введіть число (0 для виходу): ");
    value = int.Parse(Console.ReadLine());
}
while (value != 0);
```

### 5. Лічильник з умовою виходу

```
int count = 0;
do
{
    Console.WriteLine("Крок: " + count);
    count++;
}
while (count < 3);
```

---

## Приклади циклу foreach

### 1. Виведення елементів масиву

```
string[] names = {"Анна", "Богдан", "Катерина"};
foreach (string name in names)
{
    Console.WriteLine(name);
}
```

### 2. Підрахунок довжини кожного слова

```
string[] words = {"кіт", "будинок", "сонце"};
foreach (string word in words)
{
    Console.WriteLine(word + " має " + word.Length + " символів");
}
```

### 3. Обчислення суми елементів масиву

```
int[] numbers = {3, 6, 9};
int sum = 0;
foreach (int num in numbers)
{
    sum += num;
}
Console.WriteLine("Сума: " + sum);
```

### 4. Пошук максимального елемента

```
int[] nums = {5, 2, 9, 1};
int max = nums[0];
foreach (int n in nums)
{
    if (n > max)
        max = n;
}
Console.WriteLine("Максимальне число: " + max);
```

### 5. Виведення символів рядка

```
string text = "CSharp";
foreach (char c in text)
{
    Console.WriteLine(c);
}
```

---

## Висновок

Кожен тип циклу має своє призначення:

- **for** — коли відома кількість повторів;
- **while** — коли умова залежить від логіки;
- **do...while** — коли потрібно виконати тіло хоча б один раз;
- **foreach** — коли потрібно перебрати всі елементи колекції.
