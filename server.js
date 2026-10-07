// Lab05 — Хичээлд бүртгүүлэх API (Лекц 5-ын жишээ систем)
// Ажиллуулах: node server.js   (ямар ч сан суулгах шаардлагагүй)
const http = require('http');

// In-memory "өгөгдлийн сан"
const students = {};      // id -> { status, coursesTaken }
const courses = {};       // id -> { prerequisites }
const registrations = []; // { registrationID, studentID, courseID }

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let data = {};
    try { data = body ? JSON.parse(body) : {}; }
    catch { return send(res, 400, { result: 'ERROR_BAD_JSON' }); }

    const url = req.url.split('?')[0];

    // Setup endpoints — тестийн Initialization-д ашиглана
    let m;
    if (req.method === 'PUT' && (m = url.match(/^\/students\/([\w-]+)$/))) {
      students[m[1]] = {
        status: data.status || 'active',
        coursesTaken: data.coursesTaken || [],
      };
      return send(res, 200, { result: 'OK' });
    }
    if (req.method === 'PUT' && (m = url.match(/^\/courses\/([\w-]+)$/))) {
      courses[m[1]] = { prerequisites: data.prerequisites || [] };
      return send(res, 200, { result: 'OK' });
    }
    if (req.method === 'GET' && (m = url.match(/^\/courses\/([\w-]+)$/))) {
      const c = courses[m[1]];
      if (!c) return send(res, 404, { result: 'ERROR_NO_COURSE' });
      return send(res, 200, { courseID: m[1], ...c });
    }

    // Тестлэгдэх гол функц — хичээлд бүртгүүлэх
    // 201 = амжилттай, 200 + ERROR_* = оролтын алдаа (Лекц 5-ын семантик)
    if (req.method === 'POST' && url === '/registrations') {
      const { studentID, courseID } = data;
      if (!studentID || !courseID)
        return send(res, 400, { result: 'ERROR_BAD_REQUEST' });

      const student = students[studentID];
      if (!student) return send(res, 200, { result: 'ERROR_NO_STUDENT' });
      if (student.status !== 'active')
        return send(res, 200, { result: 'ERROR_INACTIVE_STUDENT' });

      const course = courses[courseID];
      if (!course) return send(res, 200, { result: 'ERROR_NO_COURSE' });

      const missing = course.prerequisites.filter(
        (p) => !student.coursesTaken.includes(p)
      );
      if (missing.length > 0)
        return send(res, 200, { result: 'ERROR_PREREQUISITES', missing });

      const registrationID = registrations.length + 1;
      registrations.push({ registrationID, studentID, courseID });
      return send(res, 201, { result: 'OK', registrationID });
    }

    if (req.method === 'GET' && url === '/registrations')
      return send(res, 200, registrations);

    send(res, 404, { result: 'ERROR_NOT_FOUND' });
  });
});

server.listen(3000, () => console.log('Бүртгэлийн API: http://localhost:3000'));
