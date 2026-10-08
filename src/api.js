const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

function jsonp(action, args = []) {
  if (!API_URL) return Promise.reject(new Error("URL Apps Script belum diatur."));
  return new Promise((resolve, reject) => {
    const callback = "mathUp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Koneksi ke Apps Script timeout."));
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
    }

    window[callback] = payload => {
      cleanup();
      if (payload && payload.ok === false) reject(new Error(payload.error || "API error."));
      else resolve(payload && payload.ok === true ? payload.data : payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Tidak dapat terhubung ke Apps Script."));
    };

    const query = new URLSearchParams({
      api: "1",
      action,
      payload: JSON.stringify(args),
      callback
    });
    script.src = API_URL + "?" + query.toString();
    document.body.appendChild(script);
  });
}

export const api = {
  getCurrentUser: () => jsonp("getCurrentUser"),
  getBootstrap: () => jsonp("getBootstrap"),
  getEffectiveSchedule: date => jsonp("getEffectiveSchedule", [date]),
  getSubstitutionRequests: () => jsonp("getSubstitutionRequests"),
  getDriveMaterials: () => jsonp("getDriveMaterials"),
  saveTodo: todo => jsonp("saveTodo", [todo]),
  updateTodo: todo => jsonp("updateTodo", [todo]),
  deleteTodo: id => jsonp("deleteTodo", [id]),
  toggleTodo: (id, done) => jsonp("toggleTodo", [id, done]),
  saveSchedule: item => jsonp("saveSchedule", [item]),
  updateSchedule: item => jsonp("updateSchedule", [item]),
  deleteSchedule: id => jsonp("deleteSchedule", [id]),
  findSubstituteCandidates: request => jsonp("findSubstituteCandidates", [request]),
  saveSubstitution: item => jsonp("saveSubstitution", [item]),
  respondSubstitution: (id, response) => jsonp("respondSubstitution", [id, response]),
  saveTeacher: teacher => jsonp("saveTeacher", [teacher]),
  saveEvent: event => jsonp("saveEvent", [event]),\n  updateEvent: event => jsonp("updateEvent", [event]),\n  deleteEvent: id => jsonp("deleteEvent", [id])
};
