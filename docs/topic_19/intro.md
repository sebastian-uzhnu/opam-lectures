---
sidebar_position: 1
---

# Стандартні діалогові вікна

Діалогові вікна є невід'ємною частиною будь-якого сучасного настільного застосунку. Вони використовуються для взаємодії з користувачем: виводу попереджень, запиту підтверджень дій, або для вибору файлів, папок, кольорів чи шрифтів.

Windows Forms надає ряд готових класів, які обгортають стандартні діалогові вікна операційної системи Windows. Їх використання робить інтерфейс вашої програми знайомим і зрозумілим для користувача.

## MessageBox (Вікно повідомлень)

`MessageBox` — це найпростіше діалогове вікно, яке використовується для інформування користувача або отримання від нього простої відповіді (Так/Ні/Скасувати). Це статичний клас, тому для його виклику не потрібно створювати об'єкт через `new`.

```csharp
// Просте повідомлення
MessageBox.Show("Операція успішно завершена.");

// Повідомлення із заголовком та іконкою
MessageBox.Show("Ви не ввели ім'я!", "Помилка", MessageBoxButtons.OK, MessageBoxIcon.Error);
```

**Отримання відповіді від користувача:**
Метод `Show` повертає значення переліку `DialogResult` (`Yes`, `No`, `Cancel`, `OK` тощо), що дозволяє легко перевірити вибір:

```csharp
DialogResult result = MessageBox.Show(
    "Ви дійсно хочете видалити цей файл?",
    "Підтвердження",
    MessageBoxButtons.YesNo,
    MessageBoxIcon.Warning);

if (result == DialogResult.Yes)
{
    // Код для видалення файлу
}
```

## OpenFileDialog (Діалог відкриття файлу)

Цей діалог дозволяє користувачеві вибрати один або кілька файлів для відкриття у вашій програмі.

**Основні властивості:**

- `Filter`: визначає типи файлів, які можна вибрати (наприклад, "Текстові файли (_.txt)|_.txt|Всі файли (_._)|_._").
- `Title`: заголовок вікна діалогу.
- `InitialDirectory`: папка, яка відкривається за замовчуванням.
- `Multiselect`: якщо `true`, дозволяє вибрати більше одного файлу одночасно.
- `FileName`: містить повний шлях до вибраного файлу (або масив у `FileNames`, якщо вибрано кілька).

**Приклад використання:**

```csharp
using (OpenFileDialog openFileDialog = new OpenFileDialog())
{
    openFileDialog.Filter = "Текстові файли (*.txt)|*.txt|Усі файли (*.*)|*.*";
    openFileDialog.Title = "Виберіть файл для читання";

    // Відображаємо діалог і чекаємо, поки користувач натисне ОК
    if (openFileDialog.ShowDialog() == DialogResult.OK)
    {
        // Отримуємо шлях до файлу та зчитуємо текст
        string filePath = openFileDialog.FileName;
        string fileContent = System.IO.File.ReadAllText(filePath);
        richTextBox1.Text = fileContent;
    }
}
```

## SaveFileDialog (Діалог збереження файлу)

Використовується, коли програмі потрібно зберегти дані і необхідно запитати у користувача ім'я нового файлу та місце його розташування.

**Основні властивості:**

- Такі ж, як і в `OpenFileDialog` (`Filter`, `Title`, `InitialDirectory`, `FileName`).
- `DefaultExt`: стандартне розширення, яке автоматично додається до імені файлу, якщо користувач його не ввів.

**Приклад використання:**

```csharp
using (SaveFileDialog saveFileDialog = new SaveFileDialog())
{
    saveFileDialog.Filter = "Текстові файли (*.txt)|*.txt";
    saveFileDialog.Title = "Збереження документа";
    saveFileDialog.DefaultExt = "txt";

    if (saveFileDialog.ShowDialog() == DialogResult.OK)
    {
        string filePath = saveFileDialog.FileName;
        // Зберігаємо вміст у вибраний файл
        System.IO.File.WriteAllText(filePath, richTextBox1.Text);
        MessageBox.Show("Файл успішно збережено!");
    }
}
```

_Примітка: Використання блоку `using` гарантує, що ресурси операційної системи (handle вікна), які використовують ці діалоги, будуть негайно звільнені після закриття._
