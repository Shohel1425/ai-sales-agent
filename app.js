import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Firebase Console > Project settings > Your apps > SDK setup > Config
const firebaseConfig = {
  apiKey: "AIzaSyDA2sJLfHGgSDPud3J4G7gOV3a_dabmhHw",
  authDomain: "takarjhor-513e6.firebaseapp.com",
  databaseURL: "https://takarjhor-513e6-default-rtdb.firebaseio.com",
  projectId: "takarjhor-513e6",
  storageBucket: "takarjhor-513e6.firebasestorage.app",
  messagingSenderId: "896280156717",
  appId: "1:896280156717:web:6f05e7d3a6d0a50290b6a4",
  measurementId: "G-LZNJJC5C21"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const status = message => { $("status").textContent = message || ""; };
const show = (id, visible) => { $(id).hidden = !visible; };

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("loginError").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value); }
  catch (err) { $("loginError").textContent = "লগইন হয়নি: " + err.message; }
});
$("logoutBtn").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, async user => {
  show("loginView", !user); show("appView", !!user);
  if (user) await loadAll();
});

document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === btn));
  document.querySelectorAll(".view").forEach(x => show(x.id, x.id === btn.dataset.tab));
}));

async function readCollection(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
function renderRows(target, rows, formatter) {
  const root = $(target); root.replaceChildren();
  if (!rows.length) { root.textContent = "এখনো কোনো তথ্য নেই।"; return; }
  rows.forEach(row => {
    const el = document.createElement("article"); el.className = "item";
    const info = document.createElement("div"); info.innerHTML = formatter(row);
    el.append(info);
    if (target === "productList") {
      const actions = document.createElement("div");
      const edit = document.createElement("button"); edit.textContent = "এডিট"; edit.className = "secondary"; edit.onclick = () => editProduct(row);
      const del = document.createElement("button"); del.textContent = "মুছুন"; del.className = "secondary"; del.onclick = () => removeProduct(row.id);
      actions.append(edit, del); el.append(actions);
    }
    root.append(el);
  });
}
async function loadAll() {
  try {
    const [products, customers, orders, conversations] = await Promise.all([
      readCollection("products"), readCollection("customers"), readCollection("orders"), readCollection("conversations")
    ]);
    $("productCount").textContent = products.length; $("customerCount").textContent = customers.length;
    $("orderCount").textContent = orders.length; $("conversationCount").textContent = conversations.length;
    renderRows("productList", products, p => `<strong>${escapeHtml(p.name || "নাম নেই")}</strong><small>৳${Number(p.price || 0).toLocaleString("en-BD")} · স্টক ${Number(p.stock || 0)} · ${p.active ? "সক্রিয়" : "বন্ধ"}</small>`);
    renderRows("customerList", customers, c => `<strong>${escapeHtml(c.name || c.phone || c.email || "গ্রাহক")}</strong><small>${escapeHtml(c.phone || c.email || "")}</small>`);
    renderRows("orderList", orders, o => `<strong>অর্ডার ${escapeHtml(o.orderNumber || o.id)}</strong><small>৳${Number(o.total || 0).toLocaleString("en-BD")} · ${escapeHtml(o.status || "নতুন")}</small>`);
    renderRows("conversationList", conversations, c => `<strong>${escapeHtml(c.customerName || c.customerId || "কথোপকথন")}</strong><small>${escapeHtml(c.lastMessage || c.channel || "")}</small>`);
    const settingsSnap = await getDoc(doc(db, "settings", "general"));
    if (settingsSnap.exists()) {
      const s = settingsSnap.data(); $("businessName").value = s.businessName || "";
      $("language").value = s.language || "bn"; $("replyMode").value = s.replyMode || "hybrid"; $("aiEnabled").checked = !!s.aiEnabled;
    }
    status("ডেটা লোড হয়েছে।");
  } catch (err) { status("ডেটা লোড হয়নি: " + err.message + " — Firestore Rules ও Database যাচাই করুন।"); }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function resetProductForm() { $("productForm").reset(); $("productId").value = ""; $("pActive").checked = true; show("productForm", false); }
$("newProductBtn").onclick = () => { resetProductForm(); show("productForm", true); };
$("cancelProduct").onclick = resetProductForm;
function editProduct(p) {
  $("productId").value = p.id; $("pName").value = p.name || ""; $("pPrice").value = p.price ?? 0;
  $("pDiscount").value = p.discount ?? 0; $("pStock").value = p.stock ?? 0; $("pCategory").value = p.category || "";
  $("pImage").value = p.imageUrl || ""; $("pDescription").value = p.description || ""; $("pActive").checked = p.active !== false;
  show("productForm", true); window.scrollTo({top: 0, behavior: "smooth"});
}
$("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = { name: $("pName").value.trim(), price: Number($("pPrice").value), discount: Number($("pDiscount").value || 0),
    stock: Number($("pStock").value || 0), category: $("pCategory").value.trim(), imageUrl: $("pImage").value.trim(),
    description: $("pDescription").value.trim(), active: $("pActive").checked, updatedAt: new Date().toISOString() };
  try {
    const id = $("productId").value;
    if (id) await updateDoc(doc(db, "products", id), data);
    else await addDoc(collection(db, "products"), {...data, createdAt: new Date().toISOString()});
    resetProductForm(); await loadAll(); status("পণ্য সেভ হয়েছে।");
  } catch (err) { status("পণ্য সেভ হয়নি: " + err.message); }
});
async function removeProduct(id) {
  if (!confirm("এই পণ্যটি মুছে ফেলবেন?")) return;
  try { await deleteDoc(doc(db, "products", id)); await loadAll(); status("পণ্য মুছে ফেলা হয়েছে।"); }
  catch (err) { status("মুছে ফেলা যায়নি: " + err.message); }
}
$("settingsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = { businessName: $("businessName").value.trim(), language: $("language").value,
    replyMode: $("replyMode").value, aiEnabled: $("aiEnabled").checked, updatedAt: new Date().toISOString() };
  try { await setDoc(doc(db, "settings", "general"), data, {merge: true}); status("সেটিংস সেভ হয়েছে।"); }
  catch (err) { status("সেটিংস সেভ হয়নি: " + err.message); }
});
