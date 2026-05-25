---
sidebar_position: 4
---

# Практичний приклад: потокобезпечний лічильник та черга завдань

## Огляд проекту

У цьому розділі ми побудуємо WPF-застосунок, який наочно демонструє:

1. **Race condition** — кілька потоків одночасно інкрементують лічильник без захисту
2. **lock** — виправлена версія з `lock`
3. **Interlocked** — оптимальна версія з `Interlocked.Increment`
4. **BlockingCollection** — потокобезпечна черга завдань у реальному часі

```
┌─────────────────────────────────────────────────────────────┐
│  Синхронізація потоків                          [─][□][✕]   │
├─────────────────────────────────────────────────────────────┤
│  Кількість потоків: [5]   Ітерацій: [100 000]               │
│                                                             │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │  БЕЗ синхронізації  │  │  З LOCK                    │   │
│  │  Очікується: 500000 │  │  Очікується: 500000        │   │
│  │  Результат:  347821 │  │  Результат:  500000 ✓      │   │
│  │  [Запустити]        │  │  [Запустити]               │   │
│  └─────────────────────┘  └────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │  З INTERLOCKED      │  │  ЧЕРГА ЗАВДАНЬ             │   │
│  │  Очікується: 500000 │  │  ┌──────────────────────┐  │   │
│  │  Результат:  500000 │  │  │ [✓] Завдання 1       │  │   │
│  │  [Запустити]        │  │  │ [✓] Завдання 2       │  │   │
│  └─────────────────────┘  │  │ [⟳] Завдання 3       │  │   │
│                            │  └──────────────────────┘  │   │
│                            │  [Додати завдання]          │   │
│                            └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Клас ThreadSafeCounter

Спочатку визначимо три варіанти лічильника:

```csharp
using System.Threading;

namespace ThreadSyncDemo;

// Версія 1: НЕБЕЗПЕЧНА — для демонстрації race condition
public class UnsafeCounter
{
    private int _value = 0;

    public void Increment() => _value++; // не атомарна!
    public int Value => _value;
    public void Reset() => _value = 0;
}

// Версія 2: БЕЗПЕЧНА через lock
public class LockCounter
{
    private int _value = 0;
    private readonly object _lock = new();

    public void Increment()
    {
        lock (_lock) { _value++; }
    }
    public int Value
    {
        get { lock (_lock) { return _value; } }
    }
    public void Reset()
    {
        lock (_lock) { _value = 0; }
    }
}

// Версія 3: БЕЗПЕЧНА через Interlocked (найшвидша)
public class InterlockedCounter
{
    private int _value = 0;

    public void Increment() => Interlocked.Increment(ref _value);
    public int Value => Interlocked.CompareExchange(ref _value, 0, 0);
    public void Reset() => Interlocked.Exchange(ref _value, 0);
}
```

---

## Клас TaskQueue (Producer-Consumer)

```csharp
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ThreadSyncDemo;

public record WorkItem(int Id, string Name, DateTime CreatedAt);

public class TaskQueue : IDisposable
{
    private readonly BlockingCollection<WorkItem> _queue;
    private readonly Thread _workerThread;
    private readonly Action<WorkItem> _onProcessed;
    private readonly Action<WorkItem> _onStarted;

    public TaskQueue(Action<WorkItem> onStarted, Action<WorkItem> onProcessed, int capacity = 20)
    {
        _queue        = new BlockingCollection<WorkItem>(capacity);
        _onStarted    = onStarted;
        _onProcessed  = onProcessed;

        _workerThread = new Thread(ProcessLoop)
        {
            IsBackground = true,
            Name = "TaskQueue-Worker"
        };
        _workerThread.Start();
    }

    public bool TryEnqueue(WorkItem item) => _queue.TryAdd(item);

    private void ProcessLoop()
    {
        foreach (WorkItem item in _queue.GetConsumingEnumerable())
        {
            _onStarted(item);
            Thread.Sleep(500); // імітуємо обробку
            _onProcessed(item);
        }
    }

    public void Dispose()
    {
        _queue.CompleteAdding();
        _workerThread.Join(TimeSpan.FromSeconds(2));
        _queue.Dispose();
    }
}
```

---

## XAML: інтерфейс додатку

**`MainWindow.xaml`:**

```xml
<Window x:Class="ThreadSyncDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Синхронізація потоків"
        Height="620" Width="820"
        Background="#1e1e2e"
        Foreground="#cdd6f4"
        FontFamily="Segoe UI"
        ResizeMode="NoResize">

    <Window.Resources>
        <!-- Стиль панелей -->
        <Style x:Key="PanelStyle" TargetType="Border">
            <Setter Property="Background"       Value="#313244"/>
            <Setter Property="CornerRadius"     Value="8"/>
            <Setter Property="Padding"          Value="16"/>
            <Setter Property="Margin"           Value="6"/>
        </Style>

        <!-- Стиль кнопок -->
        <Style x:Key="ActionButton" TargetType="Button">
            <Setter Property="Background"   Value="#89b4fa"/>
            <Setter Property="Foreground"   Value="#1e1e2e"/>
            <Setter Property="FontWeight"   Value="SemiBold"/>
            <Setter Property="Padding"      Value="12,6"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor"       Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}"
                                CornerRadius="4"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#b4d0ff"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Background" Value="#45475a"/>
                                <Setter Property="Foreground" Value="#6c7086"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <!-- Стиль полів вводу -->
        <Style TargetType="TextBox">
            <Setter Property="Background"       Value="#45475a"/>
            <Setter Property="Foreground"       Value="#cdd6f4"/>
            <Setter Property="BorderBrush"      Value="#585b70"/>
            <Setter Property="BorderThickness"  Value="1"/>
            <Setter Property="Padding"          Value="6,4"/>
            <Setter Property="CaretBrush"       Value="#cdd6f4"/>
        </Style>

        <!-- Стиль елементів списку -->
        <Style TargetType="ListBoxItem">
            <Setter Property="Background"   Value="Transparent"/>
            <Setter Property="Foreground"   Value="#cdd6f4"/>
            <Setter Property="Padding"      Value="6,3"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ListBoxItem">
                        <Border Background="{TemplateBinding Background}"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsSelected" Value="True">
                                <Setter Property="Background" Value="#45475a"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <Grid Margin="12">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Заголовок і налаштування -->
        <Border Grid.Row="0" Style="{StaticResource PanelStyle}" Margin="6,6,6,0">
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                <TextBlock Text="Кількість потоків:"
                           VerticalAlignment="Center" Margin="0,0,8,0"
                           Foreground="#a6adc8"/>
                <TextBox x:Name="ThreadCountBox" Text="5" Width="50"
                         HorizontalContentAlignment="Center"/>
                <TextBlock Text="Ітерацій на потік:"
                           VerticalAlignment="Center" Margin="20,0,8,0"
                           Foreground="#a6adc8"/>
                <TextBox x:Name="IterationsBox" Text="100000" Width="90"
                         HorizontalContentAlignment="Center"/>
            </StackPanel>
        </Border>

        <!-- Основний вміст -->
        <Grid Grid.Row="1">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            <Grid.RowDefinitions>
                <RowDefinition Height="*"/>
                <RowDefinition Height="*"/>
            </Grid.RowDefinitions>

            <!-- Панель 1: без синхронізації -->
            <Border Grid.Row="0" Grid.Column="0" Style="{StaticResource PanelStyle}">
                <StackPanel>
                    <TextBlock Text="БЕЗ СИНХРОНІЗАЦІЇ"
                               FontSize="13" FontWeight="Bold"
                               Foreground="#f38ba8" Margin="0,0,0,10"/>
                    <TextBlock Foreground="#a6adc8" FontSize="11" Margin="0,0,0,6">
                        <Run Text="Очікується: "/>
                        <Run x:Name="UnsafeExpected" Text="500 000" Foreground="#cdd6f4"/>
                    </TextBlock>
                    <TextBlock Foreground="#a6adc8" FontSize="11" Margin="0,0,0,6">
                        <Run Text="Отримано:   "/>
                        <Run x:Name="UnsafeResult" Text="—" Foreground="#f38ba8"
                             FontWeight="Bold" FontSize="13"/>
                    </TextBlock>
                    <TextBlock x:Name="UnsafeDiff" Foreground="#fab387"
                               FontSize="11" Margin="0,0,0,10"/>
                    <ProgressBar x:Name="UnsafeProgress" Height="6"
                                 Background="#45475a" Foreground="#f38ba8"
                                 Minimum="0" Margin="0,0,0,10"/>
                    <Button x:Name="UnsafeBtn" Content="Запустити"
                            Style="{StaticResource ActionButton}"
                            Click="OnUnsafeClick"/>
                </StackPanel>
            </Border>

            <!-- Панель 2: з lock -->
            <Border Grid.Row="0" Grid.Column="1" Style="{StaticResource PanelStyle}">
                <StackPanel>
                    <TextBlock Text="З LOCK"
                               FontSize="13" FontWeight="Bold"
                               Foreground="#a6e3a1" Margin="0,0,0,10"/>
                    <TextBlock Foreground="#a6adc8" FontSize="11" Margin="0,0,0,6">
                        <Run Text="Очікується: "/>
                        <Run x:Name="LockExpected" Text="500 000" Foreground="#cdd6f4"/>
                    </TextBlock>
                    <TextBlock Foreground="#a6adc8" FontSize="11" Margin="0,0,0,6">
                        <Run Text="Отримано:   "/>
                        <Run x:Name="LockResult" Text="—" Foreground="#a6e3a1"
                             FontWeight="Bold" FontSize="13"/>
                    </TextBlock>
                    <TextBlock x:Name="LockTime" Foreground="#a6adc8"
                               FontSize="11" Margin="0,0,0,10"/>
                    <ProgressBar x:Name="LockProgress" Height="6"
                                 Background="#45475a" Foreground="#a6e3a1"
                                 Minimum="0" Margin="0,0,0,10"/>
                    <Button x:Name="LockBtn" Content="Запустити"
                            Style="{StaticResource ActionButton}"
                            Click="OnLockClick"/>
                </StackPanel>
            </Border>

            <!-- Панель 3: з Interlocked -->
            <Border Grid.Row="1" Grid.Column="0" Style="{StaticResource PanelStyle}">
                <StackPanel>
                    <TextBlock Text="З INTERLOCKED"
                               FontSize="13" FontWeight="Bold"
                               Foreground="#89dceb" Margin="0,0,0,10"/>
                    <TextBlock Foreground="#a6adc8" FontSize="11" Margin="0,0,0,6">
                        <Run Text="Очікується: "/>
                        <Run x:Name="ILExpected" Text="500 000" Foreground="#cdd6f4"/>
                    </TextBlock>
                    <TextBlock Foreground="#a6adc8" FontSize="11" Margin="0,0,0,6">
                        <Run Text="Отримано:   "/>
                        <Run x:Name="ILResult" Text="—" Foreground="#89dceb"
                             FontWeight="Bold" FontSize="13"/>
                    </TextBlock>
                    <TextBlock x:Name="ILTime" Foreground="#a6adc8"
                               FontSize="11" Margin="0,0,0,10"/>
                    <ProgressBar x:Name="ILProgress" Height="6"
                                 Background="#45475a" Foreground="#89dceb"
                                 Minimum="0" Margin="0,0,0,10"/>
                    <Button x:Name="ILBtn" Content="Запустити"
                            Style="{StaticResource ActionButton}"
                            Click="OnInterlockedClick"/>
                </StackPanel>
            </Border>

            <!-- Панель 4: черга завдань -->
            <Border Grid.Row="1" Grid.Column="1" Style="{StaticResource PanelStyle}">
                <StackPanel>
                    <TextBlock Text="ЧЕРГА ЗАВДАНЬ (BlockingCollection)"
                               FontSize="13" FontWeight="Bold"
                               Foreground="#cba6f7" Margin="0,0,0,10"/>
                    <ListBox x:Name="TaskLog"
                             Height="110"
                             Background="#1e1e2e"
                             BorderBrush="#585b70"
                             BorderThickness="1"
                             ScrollViewer.VerticalScrollBarVisibility="Auto"
                             Margin="0,0,0,8"/>
                    <StackPanel Orientation="Horizontal">
                        <Button Content="Додати завдання"
                                Style="{StaticResource ActionButton}"
                                Click="OnAddTask"
                                Margin="0,0,8,0"/>
                        <Button Content="Очистити"
                                Style="{StaticResource ActionButton}"
                                Background="#45475a"
                                Foreground="#cdd6f4"
                                Click="OnClearLog"/>
                    </StackPanel>
                </StackPanel>
            </Border>
        </Grid>

        <!-- Рядок порівняння -->
        <Border Grid.Row="2" Style="{StaticResource PanelStyle}" Margin="6,0,6,6">
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Spacing="24">
                <TextBlock Foreground="#a6adc8" FontSize="11" VerticalAlignment="Center"
                           Text="Час виконання:"/>
                <TextBlock x:Name="LockTimeShort"  Foreground="#a6e3a1" FontSize="11"
                           VerticalAlignment="Center" Text="lock: —"/>
                <TextBlock x:Name="ILTimeShort"    Foreground="#89dceb" FontSize="11"
                           VerticalAlignment="Center" Text="Interlocked: —"/>
                <TextBlock x:Name="SpeedupLabel"   Foreground="#f9e2af" FontSize="11"
                           VerticalAlignment="Center"/>
            </StackPanel>
        </Border>
    </Grid>
</Window>
```

---

## Code-behind: MainWindow.xaml.cs

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace ThreadSyncDemo;

public partial class MainWindow : Window
{
    // Лічильники трьох типів
    private readonly UnsafeCounter      _unsafeCounter      = new();
    private readonly LockCounter        _lockCounter        = new();
    private readonly InterlockedCounter _interlockedCounter = new();

    // Черга завдань
    private TaskQueue? _taskQueue;
    private int        _taskIdCounter = 0;

    // Збережені часи для порівняння
    private long _lockMs        = 0;
    private long _interlockedMs = 0;

    public MainWindow()
    {
        InitializeComponent();
        InitTaskQueue();
    }

    // ─── Ініціалізація черги ────────────────────────────────────────────────

    private void InitTaskQueue()
    {
        _taskQueue = new TaskQueue(
            onStarted: item => Dispatcher.BeginInvoke(() =>
            {
                UpdateTaskLog(item.Id, $"⟳ Завдання #{item.Id} — виконується...", "#f9e2af");
            }),
            onProcessed: item => Dispatcher.BeginInvoke(() =>
            {
                UpdateTaskLog(item.Id, $"✓ Завдання #{item.Id} — виконано", "#a6e3a1");
            })
        );
    }

    // ─── Допоміжні методи ──────────────────────────────────────────────────

    private (int threads, int iterations, long expected) ParseInputs()
    {
        int threads    = int.TryParse(ThreadCountBox.Text,    out int t) ? Math.Clamp(t, 1, 20)       : 5;
        int iterations = int.TryParse(IterationsBox.Text,     out int i) ? Math.Clamp(i, 1000, 500000): 100_000;
        return (threads, iterations, (long)threads * iterations);
    }

    private void SetBusy(Button btn, bool busy)
    {
        UnsafeBtn.IsEnabled = !busy;
        LockBtn.IsEnabled   = !busy;
        ILBtn.IsEnabled     = !busy;
    }

    private void UpdateTaskLog(int taskId, string text, string hexColor)
    {
        // Шукаємо існуючий елемент або додаємо новий
        for (int i = 0; i < TaskLog.Items.Count; i++)
        {
            if (TaskLog.Items[i] is TextBlock tb &&
                tb.Tag is int id && id == taskId)
            {
                tb.Text = text;
                tb.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(hexColor));
                return;
            }
        }
        // Не знайшли — додаємо новий
        var newTb = new TextBlock
        {
            Text       = text,
            Tag        = taskId,
            FontFamily = new System.Windows.Media.FontFamily("Cascadia Code, Consolas"),
            FontSize   = 11,
            Foreground = new System.Windows.Media.SolidColorBrush(
                (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(hexColor))
        };
        TaskLog.Items.Add(newTb);
        TaskLog.ScrollIntoView(newTb);
    }

    private void UpdateSpeedComparison()
    {
        if (_lockMs == 0 || _interlockedMs == 0) return;
        LockTimeShort.Text  = $"lock: {_lockMs} мс";
        ILTimeShort.Text    = $"Interlocked: {_interlockedMs} мс";

        if (_interlockedMs > 0)
        {
            double ratio = (double)_lockMs / _interlockedMs;
            SpeedupLabel.Text = $"Interlocked швидший у {ratio:F1}x";
        }
    }

    // ─── Обробники кнопок ──────────────────────────────────────────────────

    private async void OnUnsafeClick(object sender, RoutedEventArgs e)
    {
        var (threads, iterations, expected) = ParseInputs();
        UnsafeExpected.Text = $"{expected:N0}";
        UnsafeResult.Text   = "Виконується...";
        UnsafeDiff.Text     = "";
        SetBusy(UnsafeBtn, true);

        _unsafeCounter.Reset();
        UnsafeProgress.Maximum = expected;
        UnsafeProgress.Value   = 0;

        // Запускаємо без синхронізації — спостерігаємо race condition
        await Task.Run(() =>
        {
            var tasks = new Task[threads];
            for (int i = 0; i < threads; i++)
            {
                tasks[i] = Task.Run(() =>
                {
                    for (int j = 0; j < iterations; j++)
                        _unsafeCounter.Increment();
                });
            }
            Task.WaitAll(tasks);
        });

        int result = _unsafeCounter.Value;
        long diff  = expected - result;

        UnsafeResult.Text = $"{result:N0}";
        UnsafeProgress.Value = result;

        if (diff == 0)
            UnsafeDiff.Text = "Пощастило цього разу — запустіть ще!";
        else
            UnsafeDiff.Text = $"Втрачено оновлень: {diff:N0} ({(double)diff/expected*100:F1}%)";

        SetBusy(UnsafeBtn, false);
    }

    private async void OnLockClick(object sender, RoutedEventArgs e)
    {
        var (threads, iterations, expected) = ParseInputs();
        LockExpected.Text = $"{expected:N0}";
        LockResult.Text   = "Виконується...";
        LockTime.Text     = "";
        SetBusy(LockBtn, true);

        _lockCounter.Reset();
        LockProgress.Maximum = expected;
        LockProgress.Value   = 0;

        var sw = Stopwatch.StartNew();
        await Task.Run(() =>
        {
            var tasks = new Task[threads];
            for (int i = 0; i < threads; i++)
            {
                tasks[i] = Task.Run(() =>
                {
                    for (int j = 0; j < iterations; j++)
                        _lockCounter.Increment();
                });
            }
            Task.WaitAll(tasks);
        });
        sw.Stop();
        _lockMs = sw.ElapsedMilliseconds;

        long result = _lockCounter.Value;
        LockResult.Text    = $"{result:N0}";
        LockProgress.Value = result;
        LockTime.Text      = $"Час: {_lockMs} мс";

        UpdateSpeedComparison();
        SetBusy(LockBtn, false);
    }

    private async void OnInterlockedClick(object sender, RoutedEventArgs e)
    {
        var (threads, iterations, expected) = ParseInputs();
        ILExpected.Text = $"{expected:N0}";
        ILResult.Text   = "Виконується...";
        ILTime.Text     = "";
        SetBusy(ILBtn, true);

        _interlockedCounter.Reset();
        ILProgress.Maximum = expected;
        ILProgress.Value   = 0;

        var sw = Stopwatch.StartNew();
        await Task.Run(() =>
        {
            var tasks = new Task[threads];
            for (int i = 0; i < threads; i++)
            {
                tasks[i] = Task.Run(() =>
                {
                    for (int j = 0; j < iterations; j++)
                        _interlockedCounter.Increment();
                });
            }
            Task.WaitAll(tasks);
        });
        sw.Stop();
        _interlockedMs = sw.ElapsedMilliseconds;

        long result    = _interlockedCounter.Value;
        ILResult.Text  = $"{result:N0}";
        ILProgress.Value = result;
        ILTime.Text    = $"Час: {_interlockedMs} мс";

        UpdateSpeedComparison();
        SetBusy(ILBtn, false);
    }

    private void OnAddTask(object sender, RoutedEventArgs e)
    {
        int id = Interlocked.Increment(ref _taskIdCounter);
        var item = new WorkItem(id, $"Завдання {id}", DateTime.Now);

        if (_taskQueue?.TryEnqueue(item) == true)
            UpdateTaskLog(id, $"○ Завдання #{id} — в черзі", "#a6adc8");
        else
            UpdateTaskLog(id, $"✗ Завдання #{id} — черга переповнена", "#f38ba8");
    }

    private void OnClearLog(object sender, RoutedEventArgs e)
    {
        TaskLog.Items.Clear();
    }

    protected override void OnClosed(EventArgs e)
    {
        _taskQueue?.Dispose();
        base.OnClosed(e);
    }
}
```

---

## Що ми спостерігаємо при запуску

### Панель "БЕЗ СИНХРОНІЗАЦІЇ"

Запустіть кілька разів — результат кожного разу різний:

```
Запуск 1: Отримано 347 821  (втрачено 152 179 оновлень — 30.4%)
Запуск 2: Отримано 423 905  (втрачено  76 095 оновлень — 15.2%)
Запуск 3: Отримано 500 000  (пощастило — але це виняток!)
```

:::danger Чому іноді виходить 500 000?
При малій кількості ітерацій або на швидкому одноядерному процесорі потоки можуть чергуватись "вдало" і не перетинатись. Але це — випадковість, а не коректність. На multi-core системах при великій кількості ітерацій race condition проявляється майже завжди.
:::

### Порівняння `lock` vs `Interlocked`

| Метод | Результат | Час (5 потоків × 100k) |
|---|---|---|
| Без синхронізації | ~350 000–490 000 (непередбачувано) | ~50–80 мс |
| `lock` | 500 000 (завжди) | ~300–500 мс |
| `Interlocked` | 500 000 (завжди) | ~80–150 мс |

`Interlocked` в 3–5 разів швидший за `lock` для простих числових операцій, бо використовує апаратні атомарні інструкції процесора замість системного виклику OS для блокування.

### Черга завдань

Натисніть "Додати завдання" кілька разів швидко — ви побачите, як завдання:
1. З'являються в черзі зі статусом "в черзі"
2. Переходять у стан "виконується" одне за одним
3. Завершуються із зеленим "виконано"

`BlockingCollection` гарантує FIFO-порядок і автоматично блокує воркер-потік, коли черга порожня — без `while(true) { Thread.Sleep(10); }`.

---

## Підсумок: коли що використовувати

| Сценарій | Рекомендований засіб |
|---|---|
| Захист будь-якого складного коду | `lock` — простий і надійний |
| Лічильники, прапорці, заміна посилань | `Interlocked` — найшвидший |
| Очікування умови (producer-consumer) | `Monitor.Wait/Pulse` або `BlockingCollection` |
| Обмеження кількості паралельних операцій | `SemaphoreSlim` |
| Між-процесна синхронізація | `Mutex` (named) |
| Кеш: багато читань, рідкісний запис | `ReaderWriterLockSlim` |
| Потокобезпечна черга | `ConcurrentQueue<T>` або `BlockingCollection<T>` |
| Потокобезпечний словник | `ConcurrentDictionary<K,V>` |
| Незмінний snapshot стану | `ImmutableDictionary` / `ImmutableList` |

:::tip Золоте правило синхронізації
Найкраща синхронізація — та, яку вдається уникнути. Проектуйте класи так, щоб кожен потік працював із власними даними. Якщо без спільних даних не обійтись — спочатку спробуйте `Interlocked` або `ConcurrentXxx`, і лише якщо цього недостатньо — переходьте до `lock` або більш складних примітивів.
:::
