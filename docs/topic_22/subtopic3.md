---
sidebar_position: 4
---

# Практичний приклад: форма реєстрації з оформленням

Три попередні підрозділи дали інструменти поштучно. Тепер зберемо з них
одну завершену річ — форму реєстрації учасника на курс. Вона буде виглядати
як справжній застосунок, а не як набір сірих прямокутників, і при цьому
в її розмітці не буде жодного повторення кольору.

Дорогою ми зробимо те, що показує цінність стилів найпереконливіше:
напишемо ту саму форму двічі — з інлайновим оформленням і на стилях —
і порівняємо обсяг розмітки.

## Задача

Вікно «Реєстрація учасника» містить:

- ім'я та прізвище — `TextBox`;
- електронну пошту — `TextBox`;
- пароль — `PasswordBox`;
- місто — `ComboBox`, заповнюється з code-behind;
- дату народження — `DatePicker`;
- рівень підготовки від 1 до 5 — `Slider` із підписом поточного значення;
- напрям навчання — три `RadioButton` у `GroupBox`;
- згоду з правилами — `CheckBox`;
- кнопки «Зареєструватися» і «Очистити».

Після натискання кнопки застосунок перевіряє дані. Якщо щось не так —
проблемне поле підсвічується червоним, а внизу з'являється список зауважень.
Якщо все гаразд — виводиться підсумок анкети.

## Макет вікна

```
┌─ Реєстрація учасника ──────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────┐ │
│ │  Реєстрація учасника                                   │ │  ← шапка
│ │  Заповніть анкету — ми надішлемо запрошення на пошту   │ │    (градієнт)
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│  Ім'я та прізвище                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Оксана Мельник                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  Електронна пошта                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ oksana.melnyk@example.com                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  Пароль                     Місто                          │
│  ┌────────────────────┐     ┌────────────────────────┐     │
│  │ ●●●●●●●●           │     │ Полтава            ▼   │     │
│  └────────────────────┘     └────────────────────────┘     │
│  Дата народження            Рівень підготовки: 3           │
│  ┌────────────────────┐     ├──●──────────────────┤        │
│  │ 14.03.2007     📅  │     1   2   3   4   5              │
│  └────────────────────┘                                    │
│  ┌─ Напрям навчання ────────────────────────────────────┐  │
│  │  (•) Веброзробка   ( ) Мобільна   ( ) Аналітика      │  │
│  └──────────────────────────────────────────────────────┘  │
│  [x] Погоджуюся з правилами участі                         │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Виправте: пошта має містити символ @               │    │  ← блок помилок
│  └────────────────────────────────────────────────────┘    │
│                            ┌──────────┐ ┌───────────────┐  │
│                            │ Очистити │ │Зареєструватися│  │
│                            └──────────┘ └───────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Варіант «ДО»: оформлення в кожному елементі

Ось як виглядають **три перші поля**, якщо оформлювати їх прямо в розмітці.

```xml
<TextBlock Text="Ім'я та прізвище"
           FontSize="13" FontWeight="SemiBold" Foreground="#404A54"
           Margin="0,0,0,4"/>
<TextBox x:Name="FullNameTextBox"
         FontSize="14" Padding="8,6"
         BorderBrush="#C9D2DC" BorderThickness="1"
         Background="White" Foreground="#202830"
         Margin="0,0,0,12" Height="32"/>

<TextBlock Text="Електронна пошта"
           FontSize="13" FontWeight="SemiBold" Foreground="#404A54"
           Margin="0,0,0,4"/>
<TextBox x:Name="EmailTextBox"
         FontSize="14" Padding="8,6"
         BorderBrush="#C9D2DC" BorderThickness="1"
         Background="White" Foreground="#202830"
         Margin="0,0,0,12" Height="32"/>

<TextBlock Text="Пароль"
           FontSize="13" FontWeight="SemiBold" Foreground="#404A54"
           Margin="0,0,0,4"/>
<PasswordBox x:Name="PasswordInput"
             FontSize="14" Padding="8,6"
             BorderBrush="#C9D2DC" BorderThickness="1"
             Background="White" Foreground="#202830"
             Margin="0,0,0,12" Height="32" PasswordChar="●"/>
```

Три поля — 24 рядки розмітки, і жодного корисного змісту в них немає:
це двадцять чотири рядки про кольори. Колір `#C9D2DC` уже тричі,
`#404A54` тричі, `FontSize="14"` тричі.

Порахуємо на всій формі:

| | Варіант «ДО» | Варіант «ПІСЛЯ» |
|---|---|---|
| Рядків у XAML вікна | близько 150 | близько 70 |
| Разів повторено `#C9D2DC` | 8 | 1 |
| Разів повторено `#404A54` | 9 | 1 |
| Щоб змінити колір рамки полів | правити 8 місць | правити 1 рядок |
| Щоб змінити відступи всіх полів | правити 8 місць | правити 1 рядок |
| Ризик пропустити одне місце | високий | відсутній |

## Варіант «ПІСЛЯ», крок 1: словник кольорів

Файл `Styles/AppTheme.xaml` — усе, що стосується палітри й розмірів.
Жодних стилів тут ще немає, лише «сирі» значення з іменами.

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                    xmlns:sys="clr-namespace:System;assembly=System.Runtime">

    <!-- Палітра -->
    <SolidColorBrush x:Key="BrandBrush"      Color="#2E7D6F"/>
    <SolidColorBrush x:Key="BrandDarkBrush"  Color="#25655A"/>
    <SolidColorBrush x:Key="BrandPressBrush" Color="#1D5048"/>
    <SolidColorBrush x:Key="DangerBrush"     Color="#B23A48"/>
    <SolidColorBrush x:Key="TextBrush"       Color="#202830"/>
    <SolidColorBrush x:Key="LabelBrush"      Color="#404A54"/>
    <SolidColorBrush x:Key="LineBrush"       Color="#C9D2DC"/>
    <SolidColorBrush x:Key="SurfaceBrush"    Color="#F4F6F8"/>
    <SolidColorBrush x:Key="DisabledBrush"   Color="#D3D9DF"/>

    <!-- Градієнт шапки -->
    <LinearGradientBrush x:Key="HeaderBrush" StartPoint="0,0" EndPoint="1,1">
        <GradientStop Color="#2E7D6F" Offset="0"/>
        <GradientStop Color="#1B4F6B" Offset="1"/>
    </LinearGradientBrush>

    <!-- Розміри -->
    <sys:Double x:Key="TitleFontSize">22</sys:Double>
    <sys:Double x:Key="BodyFontSize">14</sys:Double>
    <sys:Double x:Key="LabelFontSize">13</sys:Double>
    <Thickness  x:Key="FieldMargin">0,0,0,12</Thickness>
    <Thickness  x:Key="FieldPadding">8,6</Thickness>
    <CornerRadius x:Key="CardRadius">10</CornerRadius>
</ResourceDictionary>
```

## Варіант «ПІСЛЯ», крок 2: словник стилів

Файл `Styles/AppStyles.xaml` — стилі, які спираються на палітру з першого файлу.

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <!-- ===== Підписи полів (іменований стиль) ===== -->
    <Style x:Key="FieldLabelStyle" TargetType="TextBlock">
        <Setter Property="FontSize" Value="{StaticResource LabelFontSize}"/>
        <Setter Property="FontWeight" Value="SemiBold"/>
        <Setter Property="Foreground" Value="{StaticResource LabelBrush}"/>
        <Setter Property="Margin" Value="0,0,0,4"/>
    </Style>

    <!-- ===== Поля введення ===== -->
    <Style x:Key="FieldTextBoxStyle" TargetType="TextBox">
        <Setter Property="FontSize" Value="{StaticResource BodyFontSize}"/>
        <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
        <Setter Property="Padding" Value="{StaticResource FieldPadding}"/>
        <Setter Property="Margin" Value="{StaticResource FieldMargin}"/>
        <Setter Property="BorderBrush" Value="{StaticResource LineBrush}"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="Height" Value="32"/>
        <Style.Triggers>
            <Trigger Property="IsKeyboardFocusWithin" Value="True">
                <Setter Property="BorderBrush" Value="{StaticResource BrandBrush}"/>
                <Setter Property="BorderThickness" Value="2"/>
            </Trigger>
        </Style.Triggers>
    </Style>

    <!-- Стиль помилки успадковує звичайний і міняє лише рамку -->
    <Style x:Key="ErrorTextBoxStyle" TargetType="TextBox"
           BasedOn="{StaticResource FieldTextBoxStyle}">
        <Setter Property="BorderBrush" Value="{StaticResource DangerBrush}"/>
        <Setter Property="BorderThickness" Value="2"/>
        <Setter Property="Background" Value="#FDF2F3"/>
    </Style>

    <Style x:Key="FieldPasswordStyle" TargetType="PasswordBox">
        <Setter Property="FontSize" Value="{StaticResource BodyFontSize}"/>
        <Setter Property="Padding" Value="{StaticResource FieldPadding}"/>
        <Setter Property="Margin" Value="{StaticResource FieldMargin}"/>
        <Setter Property="BorderBrush" Value="{StaticResource LineBrush}"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="Height" Value="32"/>
        <Setter Property="PasswordChar" Value="●"/>
    </Style>

    <Style x:Key="ErrorPasswordStyle" TargetType="PasswordBox"
           BasedOn="{StaticResource FieldPasswordStyle}">
        <Setter Property="BorderBrush" Value="{StaticResource DangerBrush}"/>
        <Setter Property="BorderThickness" Value="2"/>
        <Setter Property="Background" Value="#FDF2F3"/>
    </Style>

    <!-- ===== Кнопки: базовий стиль і два нащадки ===== -->
    <Style x:Key="BaseButtonStyle" TargetType="Button">
        <Setter Property="FontSize" Value="{StaticResource BodyFontSize}"/>
        <Setter Property="Padding" Value="18,8"/>
        <Setter Property="MinWidth" Value="130"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="Cursor" Value="Hand"/>
        <Setter Property="Margin" Value="8,0,0,0"/>
    </Style>

    <Style x:Key="PrimaryButtonStyle" TargetType="Button"
           BasedOn="{StaticResource BaseButtonStyle}">
        <Setter Property="Background" Value="{StaticResource BrandBrush}"/>
        <Setter Property="Foreground" Value="White"/>
        <Setter Property="BorderThickness" Value="0"/>
        <Setter Property="FontWeight" Value="SemiBold"/>
        <Style.Triggers>
            <Trigger Property="IsMouseOver" Value="True">
                <Setter Property="Background"
                        Value="{StaticResource BrandDarkBrush}"/>
            </Trigger>
            <Trigger Property="IsPressed" Value="True">
                <Setter Property="Background"
                        Value="{StaticResource BrandPressBrush}"/>
            </Trigger>
            <Trigger Property="IsEnabled" Value="False">
                <Setter Property="Background"
                        Value="{StaticResource DisabledBrush}"/>
                <Setter Property="Foreground" Value="#8A939C"/>
                <Setter Property="Cursor" Value="Arrow"/>
            </Trigger>
        </Style.Triggers>
    </Style>

    <Style x:Key="GhostButtonStyle" TargetType="Button"
           BasedOn="{StaticResource BaseButtonStyle}">
        <Setter Property="Background" Value="Transparent"/>
        <Setter Property="Foreground" Value="{StaticResource LabelBrush}"/>
        <Setter Property="BorderBrush" Value="{StaticResource LineBrush}"/>
        <Style.Triggers>
            <Trigger Property="IsMouseOver" Value="True">
                <Setter Property="Background" Value="{StaticResource SurfaceBrush}"/>
            </Trigger>
        </Style.Triggers>
    </Style>

    <!-- ===== Неявні стилі: діють на всі елементи типу ===== -->
    <Style TargetType="RadioButton">
        <Setter Property="Margin" Value="0,0,18,0"/>
        <Setter Property="FontSize" Value="{StaticResource BodyFontSize}"/>
        <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
    </Style>

    <Style TargetType="GroupBox">
        <Setter Property="Padding" Value="10"/>
        <Setter Property="Margin" Value="{StaticResource FieldMargin}"/>
        <Setter Property="BorderBrush" Value="{StaticResource LineBrush}"/>
        <Setter Property="Foreground" Value="{StaticResource LabelBrush}"/>
    </Style>

    <!-- ===== Блок повідомлень про помилки ===== -->
    <Style x:Key="ErrorPanelStyle" TargetType="Border">
        <Setter Property="Background" Value="#FDF2F3"/>
        <Setter Property="BorderBrush" Value="{StaticResource DangerBrush}"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="CornerRadius" Value="6"/>
        <Setter Property="Padding" Value="10,8"/>
        <Setter Property="Margin" Value="0,4,0,10"/>
    </Style>

    <Style x:Key="ErrorTextStyle" TargetType="TextBlock">
        <Setter Property="Foreground" Value="{StaticResource DangerBrush}"/>
        <Setter Property="FontSize" Value="13"/>
        <Setter Property="TextWrapping" Value="Wrap"/>
    </Style>
</ResourceDictionary>
```

Підключення обох словників у `App.xaml` — порядок важливий, бо другий
посилається на перший:

```xml
<Application x:Class="RegistrationDemo.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
        <ResourceDictionary>
            <ResourceDictionary.MergedDictionaries>
                <ResourceDictionary Source="Styles/AppTheme.xaml"/>
                <ResourceDictionary Source="Styles/AppStyles.xaml"/>
            </ResourceDictionary.MergedDictionaries>
        </ResourceDictionary>
    </Application.Resources>
</Application>
```

## Варіант «ПІСЛЯ», крок 3: розмітка вікна

Зверніть увагу: у цьому файлі **немає жодного шістнадцяткового кольору**.

```xml
<Window x:Class="RegistrationDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Реєстрація учасника"
        Height="640" Width="520"
        FontFamily="Segoe UI"
        Background="{StaticResource SurfaceBrush}">

    <ScrollViewer VerticalScrollBarVisibility="Auto">
        <StackPanel Margin="20">

            <!-- Шапка -->
            <Border Background="{StaticResource HeaderBrush}"
                    CornerRadius="{StaticResource CardRadius}"
                    Padding="18" Margin="0,0,0,18">
                <Border.Effect>
                    <DropShadowEffect Direction="270" ShadowDepth="3"
                                      BlurRadius="12" Opacity="0.25"/>
                </Border.Effect>
                <StackPanel>
                    <TextBlock Text="Реєстрація учасника"
                               FontSize="{StaticResource TitleFontSize}"
                               Foreground="White" FontWeight="Bold"/>
                    <TextBlock Text="Заповніть анкету — ми надішлемо запрошення на пошту"
                               Foreground="#DDEFEA" TextWrapping="Wrap"
                               Margin="0,4,0,0"/>
                </StackPanel>
            </Border>

            <TextBlock Text="Ім'я та прізвище"
                       Style="{StaticResource FieldLabelStyle}"/>
            <TextBox x:Name="FullNameTextBox"
                     Style="{StaticResource FieldTextBoxStyle}"
                     MaxLength="60"/>

            <TextBlock Text="Електронна пошта"
                       Style="{StaticResource FieldLabelStyle}"/>
            <TextBox x:Name="EmailTextBox"
                     Style="{StaticResource FieldTextBoxStyle}"
                     MaxLength="60"/>

            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="12"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0">
                    <TextBlock Text="Пароль"
                               Style="{StaticResource FieldLabelStyle}"/>
                    <PasswordBox x:Name="PasswordInput"
                                 Style="{StaticResource FieldPasswordStyle}"
                                 MaxLength="24"/>
                </StackPanel>

                <StackPanel Grid.Column="2">
                    <TextBlock Text="Місто"
                               Style="{StaticResource FieldLabelStyle}"/>
                    <ComboBox x:Name="CityComboBox" Height="32"
                              Margin="{StaticResource FieldMargin}"
                              FontSize="{StaticResource BodyFontSize}"/>
                </StackPanel>
            </Grid>

            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="12"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0">
                    <TextBlock Text="Дата народження"
                               Style="{StaticResource FieldLabelStyle}"/>
                    <DatePicker x:Name="BirthDatePicker" Height="32"
                                Margin="{StaticResource FieldMargin}"
                                FontSize="{StaticResource BodyFontSize}"/>
                </StackPanel>

                <StackPanel Grid.Column="2">
                    <TextBlock x:Name="LevelLabel" Text="Рівень підготовки: 3"
                               Style="{StaticResource FieldLabelStyle}"/>
                    <Slider x:Name="LevelSlider"
                            Minimum="1" Maximum="5" Value="3"
                            TickFrequency="1" TickPlacement="BottomRight"
                            IsSnapToTickEnabled="True"
                            Margin="{StaticResource FieldMargin}"
                            ValueChanged="LevelSlider_ValueChanged"/>
                </StackPanel>
            </Grid>

            <GroupBox Header="Напрям навчання">
                <StackPanel Orientation="Horizontal">
                    <RadioButton x:Name="WebRadio" GroupName="Track"
                                 Content="Веброзробка" IsChecked="True"/>
                    <RadioButton x:Name="MobileRadio" GroupName="Track"
                                 Content="Мобільна"/>
                    <RadioButton x:Name="DataRadio" GroupName="Track"
                                 Content="Аналітика"/>
                </StackPanel>
            </GroupBox>

            <CheckBox x:Name="AgreeCheckBox"
                      Content="Погоджуюся з правилами участі"
                      FontSize="{StaticResource BodyFontSize}"
                      Margin="0,0,0,10"/>

            <!-- Блок помилок, за замовчуванням прихований -->
            <Border x:Name="ErrorPanel" Style="{StaticResource ErrorPanelStyle}"
                    Visibility="Collapsed">
                <TextBlock x:Name="ErrorTextBlock"
                           Style="{StaticResource ErrorTextStyle}"/>
            </Border>

            <TextBlock x:Name="ResultTextBlock" TextWrapping="Wrap"
                       Foreground="{StaticResource TextBrush}"
                       Margin="0,0,0,10"/>

            <!-- ОДИН обробник на всю панель кнопок -->
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Right"
                        Button.Click="ButtonsPanel_Click">
                <Button x:Name="ClearButton" Content="Очистити"
                        Style="{StaticResource GhostButtonStyle}"
                        IsCancel="True"/>
                <Button x:Name="RegisterButton" Content="Зареєструватися"
                        Style="{StaticResource PrimaryButtonStyle}"
                        IsDefault="True"/>
            </StackPanel>

        </StackPanel>
    </ScrollViewer>
</Window>
```

## Code-behind

```csharp
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;

namespace RegistrationDemo;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        // Заповнюємо список міст без Binding — простим присвоєнням
        List<string> cities =
            ["Київ", "Львів", "Одеса", "Харків", "Дніпро", "Полтава", "Вінниця"];
        CityComboBox.ItemsSource = cities;

        // Розумні межі для дати народження: від 14 до 80 років
        BirthDatePicker.DisplayDateStart = DateTime.Today.AddYears(-80);
        BirthDatePicker.DisplayDateEnd = DateTime.Today.AddYears(-14);
    }

    // Один обробник на обидві кнопки — подія Click спливає до панелі
    private void ButtonsPanel_Click(object sender, RoutedEventArgs e)
    {
        if (e.Source is not Button button) return;

        if (button == RegisterButton) Register();
        else if (button == ClearButton) ClearForm();

        e.Handled = true;
    }

    private void LevelSlider_ValueChanged(object sender,
        RoutedPropertyChangedEventArgs<double> e)
    {
        // Обробник спрацьовує ще під час побудови вікна
        if (LevelLabel is null) return;

        LevelLabel.Text = $"Рівень підготовки: {(int)LevelSlider.Value}";
    }

    // ---------- Валідація ----------

    private void Register()
    {
        ResetFieldStyles();
        var problems = new List<string>();

        var fullName = FullNameTextBox.Text.Trim();
        if (fullName.Length < 5 || !fullName.Contains(' '))
        {
            MarkError(FullNameTextBox);
            problems.Add("вкажіть ім'я та прізвище через пробіл");
        }

        var email = EmailTextBox.Text.Trim();
        if (!email.Contains('@') || !email.Contains('.') || email.Length < 6)
        {
            MarkError(EmailTextBox);
            problems.Add("пошта має містити символ @ і крапку");
        }

        var password = PasswordInput.Password;
        if (password.Length < 6)
        {
            PasswordInput.Style = (Style)FindResource("ErrorPasswordStyle");
            problems.Add("пароль має бути не коротшим за 6 символів");
        }

        if (CityComboBox.SelectedItem is not string city)
        {
            city = "";
            problems.Add("оберіть місто зі списку");
        }

        if (BirthDatePicker.SelectedDate is null)
        {
            problems.Add("вкажіть дату народження");
        }

        if (AgreeCheckBox.IsChecked != true)
        {
            problems.Add("потрібно погодитися з правилами участі");
        }

        if (problems.Count > 0)
        {
            ShowErrors(problems);
            return;
        }

        ErrorPanel.Visibility = Visibility.Collapsed;
        ShowSummary(fullName, email, city, password.Length);
    }

    private void ShowErrors(List<string> problems)
    {
        // Збираємо всі зауваження в один текст
        var lines = new List<string>();
        for (var i = 0; i < problems.Count; i++)
        {
            lines.Add($"{i + 1}. {problems[i]}");
        }

        ErrorTextBlock.Text = "Виправте:\n" + string.Join("\n", lines);
        ErrorPanel.Visibility = Visibility.Visible;
        ResultTextBlock.Text = "";
    }

    private void ShowSummary(string fullName, string email,
                             string city, int passwordLength)
    {
        var track = "Веброзробка";
        if (MobileRadio.IsChecked == true) track = "Мобільна розробка";
        else if (DataRadio.IsChecked == true) track = "Аналітика даних";

        var birth = BirthDatePicker.SelectedDate ?? DateTime.Today;
        var age = DateTime.Today.Year - birth.Year;
        if (birth.Date > DateTime.Today.AddYears(-age)) age--;

        var level = (int)LevelSlider.Value;

        ResultTextBlock.Text =
            $"Заявку прийнято!\n" +
            $"Учасник: {fullName} ({age} р.)\n" +
            $"Пошта: {email}, місто: {city}\n" +
            $"Напрям: {track}, рівень підготовки: {level} з 5\n" +
            $"Пароль збережено ({passwordLength} символів)";
    }

    // ---------- Керування оформленням ----------

    // Повертаємо всім полям звичайний стиль.
    // Ми міняємо саме Style, а не BorderBrush: локальне значення
    // BorderBrush перебило б тригер фокуса зі стилю.
    private void ResetFieldStyles()
    {
        var normalTextBox = (Style)FindResource("FieldTextBoxStyle");
        FullNameTextBox.Style = normalTextBox;
        EmailTextBox.Style = normalTextBox;
        PasswordInput.Style = (Style)FindResource("FieldPasswordStyle");
    }

    private void MarkError(TextBox field)
    {
        field.Style = (Style)FindResource("ErrorTextBoxStyle");
    }

    private void ClearForm()
    {
        ResetFieldStyles();

        FullNameTextBox.Clear();
        EmailTextBox.Clear();
        PasswordInput.Clear();
        CityComboBox.SelectedIndex = -1;
        BirthDatePicker.SelectedDate = null;
        LevelSlider.Value = 3;
        WebRadio.IsChecked = true;
        AgreeCheckBox.IsChecked = false;

        ErrorPanel.Visibility = Visibility.Collapsed;
        ResultTextBlock.Text = "";
        FullNameTextBox.Focus();
    }
}
```

## Вивід

Натискання «Зареєструватися» з порожньою формою:

```
Виправте:
1. вкажіть ім'я та прізвище через пробіл
2. пошта має містити символ @ і крапку
3. пароль має бути не коротшим за 6 символів
4. оберіть місто зі списку
5. вкажіть дату народження
6. потрібно погодитися з правилами участі
```

Поля «Ім'я та прізвище», «Електронна пошта» і «Пароль» при цьому
отримують червону рамку й блідо-рожевий фон — без жодного рядка
про кольори в code-behind, лише через підміну стилю.

Коректно заповнена форма:

```
Заявку прийнято!
Учасник: Оксана Мельник (19 р.)
Пошта: oksana.melnyk@example.com, місто: Полтава
Напрям: Веброзробка, рівень підготовки: 3 з 5
Пароль збережено (8 символів)
```

## Чому саме так, а не інакше

:::tip[Порада]
Підсвічування помилки зроблено **підміною стилю**, а не присвоєнням
`field.BorderBrush = Brushes.Red`. Причина — таблиця пріоритетів
із підрозділу 2: присвоєння з коду створює локальне значення, яке назавжди
переб'є тригер фокуса зі стилю. Після такої «підсвітки» поле перестало б
реагувати на фокус, і повернути все як було довелося б рядком
`field.ClearValue(Control.BorderBrushProperty)`. Підміна стилю чистіша.
:::

:::info[Цікаво]
Кнопки «Очистити» й «Зареєструватися» не мають власних обробників `Click` —
натомість обробник висить на панелі, а всередині ми порівнюємо `e.Source`
з іменами кнопок. Для двох кнопок виграш невеликий, але для панелі з десяти
кнопок це різниця між одним методом і десятьма.
:::

:::warning[Обережно]
`IsCancel="True"` на кнопці «Очистити» означає, що вона реагує на `Escape`.
Якщо це вікно колись відкриють як модальний діалог методом `ShowDialog`,
така кнопка ще й закриє його. Для головного вікна це безпечно, але
пам'ятайте про побічний ефект.
:::

## Типові помилки

1. **`Label` замість `TextBlock` для довгого тексту.** Підзаголовок
   у шапці форми складається з двох рядків. У `Label` він просто обірветься
   на межі вікна: `Label` не вміє переносити рядки взагалі. Для будь-якого
   тексту, довшого за два-три слова, — `TextBlock` із `TextWrapping="Wrap"`.

2. **Ресурс без `x:Key`.** Запис `SolidColorBrush Color="#2E7D6F"` без ключа
   у словнику ресурсів дає помилку компіляції XAML. Ключ обов'язковий
   для всього, крім стилю з `TargetType` (неявного стилю).

3. **`StaticResource` на ресурс, оголошений нижче за місцем використання.**
   XAML читається згори вниз. Якщо у словнику стилів `FieldTextBoxStyle`
   стоїть **після** `ErrorTextBoxStyle`, який на нього посилається
   через `BasedOn`, вікно впаде при завантаженні з повідомленням
   «ресурс не знайдено». Ліки: базові ресурси — на початку словника,
   похідні — далі; палітра підключається в `MergedDictionaries` першою.

4. **Стиль без `TargetType`.** Тоді `Setter Property="Background"` не знає,
   чия це властивість, і доводиться писати `Button.Background`. Помилку
   в назві компілятор XAML не помітить — вилізе під час запуску.
   Завжди пишіть `TargetType`.

5. **Обробник події на кожній кнопці замість одного на панелі.**
   Десять кнопок — десять майже однакових методів, які легко розсинхронізувати.
   Один обробник на контейнері через `Button.Click` і розбір `e.Source`
   робить ту саму роботу одним методом.

6. **Локальні кольори поверх стилю.** Якщо на кнопці залишити
   `Background="#2E7D6F"` «для наочності», тригери `IsMouseOver`
   та `IsPressed` зі стилю перестануть працювати. Локальне значення
   сильніше за тригер — це головне практичне наслідування таблиці
   пріоритетів властивостей залежності.

## Підсумок теми

- Елементи керування діляться на ContentControl (`Content`) та
  ItemsControl (`ItemsSource`); `TextBlock`, `TextBox`, `PasswordBox`
  стоять окремо з властивістю тексту.
- Властивість залежності зберігає значення не в об'єкті, а в системі
  властивостей, і збирає його з кількох джерел за чіткою таблицею
  пріоритетів. Звідси беруться успадкування шрифту, стилі, тригери
  й анімація.
- Маршрутизована подія подорожує деревом: спочатку вниз у `Preview`-фазі,
  потім угору. Це дозволяє один обробник на контейнер і перехоплення
  введення до того, як воно відбулося.
- Ресурс дає значенню ім'я, стиль дає імені цілий набір значень,
  тригер робить значення умовним, а `ControlTemplate` замінює вигляд
  елемента повністю.
- Правильно оформлений застосунок містить нуль шістнадцяткових кольорів
  у розмітці вікон — вони живуть у словнику ресурсів.
