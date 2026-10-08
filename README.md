# Лаборатори №5 — API систем тест: Postman ба Newman

**Оюутан:** Т. Амармэнд
**Оюутны код:** B232270036
**Хичээл:** F.CSA313 — Программ хангамжийн чанарын баталгаа ба тест (2026)
**Репозитор:** https://github.com/Nonsense727/f-csa313-lab05

---

## 1. Орчны хувилбар

```
$ node -v
v22.22.2

$ newman -v
6.2.2
```

Newman 6.2.2 нь Node.js 22.22.2 дээр ажиллаж байна.

> **Анхаар — proxy тохиргоо.** Энэ машин дээр системийн `HTTP_PROXY` орчны хувьсагч
> тохируулагдсан байдаг. Newman түүгээр дамжуулж хүсэлтийн URL-ыг абсолют
> (`http://localhost:3000/...`) болгодог тул локал сервер хүсэлтийг танихгүй,
> `404 ERROR_NOT_FOUND` буцаадаг. Иймд локал API руу хийх хүсэлтүүдэд proxy-г
> тойрох шаардлагатай:
>
> ```bash
> NO_PROXY=localhost,127.0.0.1 newman run lab05-collection.json
> ```

---

## 2. Тестлэгдэх систем

Лекц 5-ын жишээ систем — хичээлд бүртгүүлэх API. Сервер нь `server.js`
(цэвэр Node.js, нэмэлт сан шаардлагагүй, in-memory өгөгдөл) бөгөөд
`http://localhost:3000` дээр ажиллана.

```bash
node server.js
```

| Endpoint | Метод | Зориулалт | Хүсэлтийн бие (JSON) | Хариу |
|---|---|---|---|---|
| `/students/:id` | PUT | Оюутны бичлэг тавих (setup) | `{"status":"active","coursesTaken":["CS201"]}` | `200 {"result":"OK"}` |
| `/courses/:id` | PUT | Хичээлийн бичлэг тавих (setup) | `{"prerequisites":["CS201"]}` | `200 {"result":"OK"}` |
| `/courses/:id` | GET | Хичээлийг харах | — | `200 {"courseID","prerequisites"}` / `404` |
| `/registrations` | POST | **Тестлэгдэх функц** — хичээлд бүртгүүлэх | `{"studentID":"B231234567","courseID":"CS313"}` | Доорх хүснэгт |
| `/registrations` | GET | Бүртгэлүүдийг харах | — | `200 [{registrationID,studentID,courseID}]` |

### POST /registrations-ийн хариу

| Нөхцөл | Статус | Хариуны бие |
|---|---|---|
| Амжилттай бүртгэл | 201 | `{"result":"OK","registrationID":n}` |
| Оюутан байхгүй | 200 | `{"result":"ERROR_NO_STUDENT"}` |
| Оюутан идэвхгүй (status ≠ "active") | 200 | `{"result":"ERROR_INACTIVE_STUDENT"}` |
| Хичээл байхгүй | 200 | `{"result":"ERROR_NO_COURSE"}` |
| Урьдач нөхцөл дутуу | 200 | `{"result":"ERROR_PREREQUISITES","missing":["CS201"]}` |
| studentID эсвэл courseID талбар дутуу | 400 | `{"result":"ERROR_BAD_REQUEST"}` |
| Буруу JSON | 400 | `{"result":"ERROR_BAD_JSON"}` |

Сервер шалгалтыг дараах **дарааллаар** хийдэг (давхар алдааны хослолыг тайлбарлахад чухал):
`талбар бүрэн эсэх → оюутан байгаа эсэх → оюутан идэвхтэй эсэх → хичээл байгаа эсэх → урьдач нөхцөл`.

---

## 3. Тест дизайн — Лекц 5-ын 5 алхам

### Алхам 1 — Бие даан тестлэгдэх функц

`POST /registrations` — өөрөөр хэлбэл **хичээлд бүртгүүлэх** үйлдэл.
Оролт: `studentID`, `courseID`. Гаралт: статус код + `result` утга (+ `missing`, `registrationID`).

### Алхам 2 — Сонголт ба төлөөлөх утгын хүснэгт

| # | Сонголт (фактор) | Эквивалент анги (төлөөлөх утгууд) |
|---|---|---|
| **F1** | `studentID`-гийн хүчинтэй байдал | a) идэвхтэй оюутан (`status="active"`) · b) идэвхгүй оюутан (`status="inactive"`) · c) бүртгэлгүй оюутан |
| **F2** | Оюутны үзсэн хичээлүүд (`coursesTaken`) | a) урьдач нөхцөлийг бүрэн хангана · b) огт хангахгүй (хоосон эсвэл холбоогүй хичээл) · c) зарим нь хангана |
| **F3** | `courseID`-гийн хүчинтэй байдал | a) байгаа хичээл · b) байхгүй хичээл |
| **F4** | Хичээлийн урьдач нөхцөл (`prerequisites`) | a) урьдач нөхцөлгүй (хоосон массив) · b) бүгд үзсэн · c) огт үзээгүй · d) зарим нь үзсэн |
| **F5** | Хүсэлтийн биеийн бүрэн бүтэн байдал | a) `studentID` ба `courseID` хоёулаа байна · b) аль нэг талбар дутуу |

### Алхам 3 — Спецификаци (11 спецификаци)

Лекцийн стратегиар: happy path **1**, алдааны анги бүрд **1** (нийт 4),
давхар алдааны сонирхолтой хослол **2**, хязгаарын тохиолдол **3**, зарим урьдач нөхцөл **1**.

| ID | Сонголтуудын хослол | Оюутан (setup) | Хичээл (setup) | Хүлээгдэх статус | Хүлээгдэх `result` |
|---|---|---|---|---|---|
| **S1** | F1a · F2a · F3a · F4b | `active`, `coursesTaken=[CS201]` | `CS313`, `prerequisites=[CS201]` | **201** | `OK` |
| **S2** | F1b · F2a · F3a · F4b | `inactive`, `coursesTaken=[CS201]` | `CS313`, `prerequisites=[CS201]` | **200** | `ERROR_INACTIVE_STUDENT` |
| **S3** | F1c · F3a · F4b | _(бүртгэлгүй)_ | `CS313`, `prerequisites=[CS201]` | **200** | `ERROR_NO_STUDENT` |
| **S4** | F1a · F3b | `active`, `coursesTaken=[CS201]` | _(бүртгэлгүй)_ | **200** | `ERROR_NO_COURSE` |
| **S5** | F1a · F2b · F4c | `active`, `coursesTaken=[CS101]` (холбоогүй) | `CS313`, `prerequisites=[CS201]` | **200** | `ERROR_PREREQUISITES` (`missing=["CS201"]`) |
| **S6** | F1a · F4a — _хязгаар_ | `active`, `coursesTaken=[]` | `CS101`, `prerequisites=[]` | **201** | `OK` |
| **S7** | F1a · F2b — _хязгаар: хоосон `coursesTaken`_ | `active`, `coursesTaken=[]` | `CS313`, `prerequisites=[CS201]` | **200** | `ERROR_PREREQUISITES` (`missing=["CS201"]`) |
| **S8** | F5b — _хязгаар: талбар дутуу_ | `active`, `coursesTaken=[CS201]` | `CS313`, `prerequisites=[CS201]` | **400** | `ERROR_BAD_REQUEST` |
| **S9** | F1b · F3b — _давхар алдаа_ | `inactive`, `coursesTaken=[]` | _(бүртгэлгүй)_ | **200** | `ERROR_INACTIVE_STUDENT` |
| **S10** | F1c · F4b — _давхар алдаа_ | _(бүртгэлгүй)_ | `CS313`, `prerequisites=[CS201]` | **200** | `ERROR_NO_STUDENT` |
| **S11** | F1a · F2c · F4d — _зарим нь_ | `active`, `coursesTaken=[CS201]` | `CS313`, `prerequisites=[CS201,CS202]` | **200** | `ERROR_PREREQUISITES` (`missing=["CS202"]`) |

**Тайлбар — S9 ба S10 (давхар алдаа).** Зааварт аль алдаа түрүүлж буцахыг заагаагүй тул
үүнийг тестээр тогтоосон: сервер **эхлээд оюутанг** шалгадаг. S9-д оюутан идэвхгүй,
хичээл байхгүй — гэвч `ERROR_INACTIVE_STUDENT` буцна. S10-д оюутан байхгүй, урьдач
нөхцөл дутуу — гэвч `ERROR_NO_STUDENT` буцна. Хэрэв сервер хичээлээ түрүүлж шалгасан бол
S9 → `ERROR_NO_COURSE`, S10 → `ERROR_PREREQUISITES` байх байсан.
