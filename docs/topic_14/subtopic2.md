---
sidebar_position: 3
---

# Події (Events)

Події дозволяють класу або об'єкту повідомляти інші класи чи об'єкти про те, що щось трапилося. Клас, який надсилає (генерує) подію, називається **видавцем** (publisher), а класи, які приймають (обробляють) подію — **підписниками** (subscribers).

## Принцип роботи та ключове слово event

Події базуються на делегатах. Ключове слово `event` — це спеціальний модифікатор для оголошення делегата, який накладає певні обмеження:

1. Подію можна викликати тільки з класу, в якому вона оголошена.
2. Ззовні класу доступні лише операції підписки (`+=`) та відписки (`-=`). Присвоєння (`=`) заборонено, щоб не затерти інших підписників.

## Створення власної події

Стандартний шаблон для створення подій рекомендує використовувати делегат `EventHandler` або `EventHandler<TEventArgs>`.

```csharp
using System;

namespace EventExample
{
    // Аргументи події (дані, що передаються підписникам)
    public class TemperatureChangedEventArgs : EventArgs
    {
        public double NewTemperature { get; }
        public TemperatureChangedEventArgs(double temp) => NewTemperature = temp;
    }

    // Клас-видавець (Publisher)
    public class Thermostat
    {
        // Оголошення події
        public event EventHandler<TemperatureChangedEventArgs>? TemperatureChanged;

        private double _currentTemperature;

        public void SetTemperature(double newTemp)
        {
            if (_currentTemperature != newTemp)
            {
                _currentTemperature = newTemp;
                // Генерація події
                OnTemperatureChanged(new TemperatureChangedEventArgs(newTemp));
            }
        }

        // Захищений віртуальний метод для виклику події
        protected virtual void OnTemperatureChanged(TemperatureChangedEventArgs e)
        {
            // Перевірка на null (?.) гарантує, що подія викличеться тільки якщо є підписники
            TemperatureChanged?.Invoke(this, e);
        }
    }

    // Клас-підписник (Subscriber)
    class Display
    {
        public void OnTempChanged(object? sender, TemperatureChangedEventArgs e)
        {
            Console.WriteLine($"Дисплей: Температура змінилася на {e.NewTemperature} градусів.");
        }
    }

    class Program
    {
        static void Main()
        {
            Thermostat thermostat = new Thermostat();
            Display display = new Display();

            // Підписка на подію
            thermostat.TemperatureChanged += display.OnTempChanged;

            thermostat.SetTemperature(25);
            // Виведе: Дисплей: Температура змінилася на 25 градусів.

            // Відписка
            thermostat.TemperatureChanged -= display.OnTempChanged;
        }
    }
}
```

## Події у WinForms та WPF

У графічних інтерфейсах (GUI) події є основним механізмом взаємодії. Наприклад, натискання кнопки генерує подію `Click`.

```csharp
// Приклад у WinForms
Button myButton = new Button();
myButton.Text = "Click Me";

// Підписка на подію Click (використання лямбда-виразу як обробника)
myButton.Click += (sender, e) =>
{
    MessageBox.Show("Кнопку натиснуто!");
};
```

У WPF принцип такий самий, але часто використовується прив'язка команд (Commands) для MVVM патерну, хоча класичні події також підтримуються.
