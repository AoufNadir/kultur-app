import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { api, getToken, login, setToken } from "./lib/api";
import type { AuditLog, DashboardSummary, ImportPreview, Role, User } from "./types/api";

type FieldType = "text" | "number" | "date" | "email" | "password" | "textarea";

type FieldConfig = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  help?: string;
  options?: Array<{ value: string; label: string }>;
};

type ResourceConfig = {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  fields: FieldConfig[];
  columns: Array<{ key: string; label: string }>;
};

type ResourceRecord = {
  id?: number;
  [key: string]: unknown;
};

type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
};

type ImportTarget = {
  label: string;
  hint: string;
  fields: ImportField[];
};

type ThemeMode = "light" | "dark";

const currencyOptions = [
  { value: "USD", label: "دولار USD" },
  { value: "DZD", label: "دينار DZD" },
  { value: "CNY", label: "يوان CNY" },
  { value: "USDT", label: "USDT" },
];

const priorityOptions = [
  { value: "عاجلة", label: "عاجلة" },
  { value: "عادية", label: "عادية" },
  { value: "منخفضة", label: "منخفضة" },
];

const taskStatusOptions = [
  { value: "جديدة", label: "جديدة" },
  { value: "قيد العمل", label: "قيد العمل" },
  { value: "بانتظار رد", label: "بانتظار رد" },
  { value: "منتهية", label: "منتهية" },
];

const customerStatusOptions = [
  { value: "مهتم", label: "مهتم" },
  { value: "تم التواصل", label: "تم التواصل" },
  { value: "عرض سعر", label: "عرض سعر" },
  { value: "عميل", label: "عميل" },
  { value: "غير مهتم", label: "غير مهتم" },
];

const customerSourceOptions = [
  { value: "فيسبوك", label: "فيسبوك" },
  { value: "إنستغرام", label: "إنستغرام" },
  { value: "واتساب", label: "واتساب" },
  { value: "معرض", label: "معرض" },
  { value: "توصية", label: "توصية" },
  { value: "موقع", label: "موقع" },
  { value: "أخرى", label: "أخرى" },
];

const supplierCountryOptions = [
  { value: "الصين", label: "الصين" },
  { value: "تركيا", label: "تركيا" },
  { value: "الإمارات", label: "الإمارات" },
  { value: "الجزائر", label: "الجزائر" },
  { value: "أوروبا", label: "أوروبا" },
  { value: "أخرى", label: "أخرى" },
];

const orderStatusOptions = [
  { value: "لم تبدأ", label: "لم تبدأ" },
  { value: "تم الشروع فيها", label: "تم الشروع فيها" },
  { value: "قيد التجهيز", label: "قيد التجهيز" },
  { value: "قيد الشحن", label: "قيد الشحن" },
  { value: "مكتملة", label: "مكتملة" },
];

const orderLocationOptions = [
  { value: "لم تحدد", label: "لم تحدد" },
  { value: "عند العميل", label: "عند العميل" },
  { value: "عند المورد", label: "عند المورد" },
  { value: "في المخزن", label: "في المخزن" },
  { value: "في الطريق", label: "في الطريق" },
  { value: "وصلت الجزائر", label: "وصلت الجزائر" },
  { value: "تم التسليم", label: "تم التسليم" },
];

const shipmentStatusOptions = [
  { value: "قيد التحضير", label: "قيد التحضير" },
  { value: "في الطريق", label: "في الطريق" },
  { value: "وصلت الجزائر", label: "وصلت الجزائر" },
  { value: "تم التسليم", label: "تم التسليم" },
  { value: "متأخرة", label: "متأخرة" },
];

const shipmentCarrierOptions = [
  { value: "DHL", label: "DHL" },
  { value: "FedEx", label: "FedEx" },
  { value: "UPS", label: "UPS" },
  { value: "EMS", label: "EMS" },
  { value: "شحن بحري", label: "شحن بحري" },
  { value: "شحن جوي", label: "شحن جوي" },
  { value: "شركة محلية", label: "شركة محلية" },
  { value: "أخرى", label: "أخرى" },
];

const carStatusOptions = [
  { value: "متاحة", label: "متاحة" },
  { value: "محجوزة", label: "محجوزة" },
  { value: "مباعة", label: "مباعة" },
  { value: "قيد التفاوض", label: "قيد التفاوض" },
];

const carSourceOptions = [
  { value: "مزاد اليابان", label: "مزاد اليابان" },
  { value: "الصين", label: "الصين" },
  { value: "أوروبا", label: "أوروبا" },
  { value: "الإمارات", label: "الإمارات" },
  { value: "معرض", label: "معرض" },
  { value: "عميل", label: "عميل" },
  { value: "أخرى", label: "أخرى" },
];

const transactionTypeOptions = [
  { value: "income", label: "دخل" },
  { value: "expense", label: "مصروف" },
  { value: "transfer", label: "تحويل" },
];

const transactionCategoryOptions = [
  { value: "دفعة عميل", label: "دفعة عميل" },
  { value: "دفع مورد", label: "دفع مورد" },
  { value: "شحن", label: "شحن" },
  { value: "شراء سيارة", label: "شراء سيارة" },
  { value: "مصاريف تشغيل", label: "مصاريف تشغيل" },
  { value: "تحويل داخلي", label: "تحويل داخلي" },
  { value: "أخرى", label: "أخرى" },
];

const importTargets: Record<string, ImportTarget> = {
  customers: {
    label: "العملاء",
    hint: "لاستيراد العملاء، يكفي غالبا اسم العميل ورقم الهاتف. باقي الحقول اختيارية.",
    fields: [
      { key: "name", label: "اسم العميل", required: true, aliases: ["name", "customer name", "client", "الاسم", "اسم العميل", "العميل"] },
      { key: "phone", label: "الهاتف", aliases: ["phone", "mobile", "tel", "الهاتف", "رقم الهاتف", "الجوال"] },
      { key: "email", label: "البريد الإلكتروني", aliases: ["email", "mail", "البريد", "البريد الإلكتروني"] },
      { key: "source", label: "المصدر", aliases: ["source", "المصدر", "مصدر"] },
      { key: "status", label: "الحالة", aliases: ["status", "الحالة"] },
      { key: "interest", label: "الاهتمام", aliases: ["interest", "الاهتمام", "مهتم ب"] },
      { key: "notes", label: "ملاحظات", aliases: ["notes", "note", "ملاحظات", "ملاحظة"] },
    ],
  },
  suppliers: {
    label: "الموردون",
    hint: "استيراد أسماء الموردين وبيانات الاتصال.",
    fields: [
      { key: "name", label: "اسم المورد", required: true, aliases: ["name", "supplier", "supplier name", "الاسم", "اسم المورد", "المورد"] },
      { key: "phone", label: "الهاتف", aliases: ["phone", "mobile", "الهاتف", "رقم الهاتف"] },
      { key: "email", label: "البريد الإلكتروني", aliases: ["email", "البريد", "البريد الإلكتروني"] },
      { key: "country", label: "الدولة", aliases: ["country", "الدولة", "بلد"] },
      { key: "notes", label: "ملاحظات", aliases: ["notes", "ملاحظات", "ملاحظة"] },
    ],
  },
  tasks: {
    label: "المهام",
    hint: "استيراد قائمة مهام بسيطة للفريق.",
    fields: [
      { key: "title", label: "المهمة", required: true, aliases: ["title", "task", "المهمة", "عنوان", "العنوان"] },
      { key: "description", label: "التفاصيل", aliases: ["description", "details", "الوصف", "التفاصيل"] },
      { key: "status", label: "الحالة", aliases: ["status", "الحالة"] },
      { key: "priority", label: "الأولوية", aliases: ["priority", "الأولوية"] },
      { key: "due_date", label: "الموعد النهائي", aliases: ["due_date", "due date", "الموعد", "الموعد النهائي"] },
    ],
  },
  orders: {
    label: "الطلبات",
    hint: "استيراد الطلبات يحتاج اسم المنتج على الأقل. السعر والكمية يساعدان في حساب الإجمالي.",
    fields: [
      { key: "product_name", label: "اسم المنتج", required: true, aliases: ["product_name", "product", "item", "المنتج", "اسم المنتج"] },
      { key: "quantity", label: "الكمية", aliases: ["quantity", "qty", "الكمية"] },
      { key: "unit_price", label: "سعر الوحدة", aliases: ["unit_price", "unit price", "price", "سعر الوحدة", "السعر"] },
      { key: "shipping_fee", label: "رسوم الشحن", aliases: ["shipping_fee", "shipping", "رسوم الشحن", "الشحن"] },
      { key: "currency", label: "العملة", aliases: ["currency", "العملة"] },
      { key: "status", label: "الحالة", aliases: ["status", "الحالة"] },
      { key: "notes", label: "ملاحظات", aliases: ["notes", "ملاحظات", "ملاحظة"] },
    ],
  },
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const storedTheme = window.localStorage.getItem("kultur-theme");
  return storedTheme === "dark" ? "dark" : "light";
}

function guessColumn(headers: string[], aliases: string[]): string {
  const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const normalizedAliases = aliases.map(normalizeHeader);
  return normalizedHeaders.find((header) => normalizedAliases.includes(header.normalized))?.original ?? "";
}

const resourceConfigs: ResourceConfig[] = [
  {
    key: "tasks",
    title: "المهام",
    description: "اكتب الأعمال اليومية، حدد الأولوية، وتابع هل انتهت أم لا.",
    endpoint: "/tasks",
    fields: [
      { name: "title", label: "ما هي المهمة؟", required: true, placeholder: "مثال: متابعة شحنة العميل أحمد" },
      { name: "description", label: "تفاصيل إضافية", type: "textarea", placeholder: "أي ملاحظة تساعد الفريق" },
      { name: "status", label: "حالة المهمة", defaultValue: "جديدة", options: taskStatusOptions },
      { name: "priority", label: "الأولوية", defaultValue: "عادية", options: priorityOptions },
      { name: "due_date", label: "الموعد النهائي", type: "date" },
      { name: "assigned_to_id", label: "رقم الموظف المسؤول", type: "number", help: "اختياري. يمكن تركه فارغا حاليا." },
    ],
    columns: [
      { key: "title", label: "العنوان" },
      { key: "status", label: "الحالة" },
      { key: "priority", label: "الأولوية" },
      { key: "due_date", label: "الموعد" },
    ],
  },
  {
    key: "customers",
    title: "العملاء",
    description: "احفظ العملاء والمهتمين ومصدرهم وماذا يريدون.",
    endpoint: "/crm/customers",
    fields: [
      { name: "name", label: "اسم العميل", required: true, placeholder: "مثال: أحمد بن علي" },
      { name: "phone", label: "رقم الهاتف" },
      { name: "email", label: "البريد الإلكتروني", type: "email" },
      { name: "source", label: "كيف وصل إلينا؟", options: customerSourceOptions },
      { name: "status", label: "حالة العميل", defaultValue: "مهتم", options: customerStatusOptions },
      { name: "interest", label: "ماذا يهمه؟", placeholder: "مثال: سيارة، شحن، منتج معين" },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "الاسم" },
      { key: "phone", label: "الهاتف" },
      { key: "source", label: "المصدر" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "suppliers",
    title: "الموردون",
    description: "سجل الموردين الذين تتعامل معهم ومعلومات الاتصال بهم.",
    endpoint: "/orders/suppliers",
    fields: [
      { name: "name", label: "اسم المورد", required: true },
      { name: "phone", label: "الهاتف" },
      { name: "email", label: "البريد الإلكتروني", type: "email" },
      { name: "country", label: "الدولة", options: supplierCountryOptions },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "الاسم" },
      { key: "phone", label: "الهاتف" },
      { key: "country", label: "الدولة" },
    ],
  },
  {
    key: "orders",
    title: "الطلبات",
    description: "سجل طلب العميل، الكمية، السعر، ورسوم الشحن. الإجمالي يحسب تلقائيا.",
    endpoint: "/orders",
    fields: [
      { name: "product_name", label: "اسم المنتج أو الطلب", required: true, placeholder: "مثال: قطع غيار / سيارة / شحنة" },
      { name: "customer_id", label: "رقم العميل", type: "number", help: "اختياري. الرقم يظهر في جدول العملاء." },
      { name: "supplier_id", label: "رقم المورد", type: "number", help: "اختياري. الرقم يظهر في جدول الموردين." },
      { name: "assigned_to_id", label: "المسؤول عن الطلبية", type: "number", help: "في شاشة الطلبات الجديدة سيكون هذا اختيارا من قائمة الموظفين." },
      { name: "priority", label: "الأولوية", defaultValue: "عادية", options: priorityOptions },
      { name: "current_location", label: "أين الطلبية؟", defaultValue: "لم تحدد", options: orderLocationOptions },
      { name: "status", label: "هل بدأنا فيها؟", defaultValue: "لم تبدأ", options: orderStatusOptions },
      { name: "currency", label: "العملة", defaultValue: "USD", options: currencyOptions },
      { name: "quantity", label: "الكمية", type: "number", defaultValue: 1 },
      { name: "unit_price", label: "سعر الوحدة", type: "number", defaultValue: 0 },
      { name: "shipping_fee", label: "رسوم الشحن على العميل", type: "number", defaultValue: 0 },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
    columns: [
      { key: "product_name", label: "المنتج" },
      { key: "quantity", label: "الكمية" },
      { key: "total_price", label: "الإجمالي" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "shipments",
    title: "الشحن",
    description: "تابع الشحنات، رقم التتبع، شركة الشحن، الحالة، والوجهة.",
    endpoint: "/shipments",
    fields: [
      { name: "order_id", label: "رقم الطلب", type: "number", help: "اختياري. الرقم يظهر في جدول الطلبات." },
      { name: "tracking_number", label: "رقم التتبع" },
      { name: "carrier", label: "شركة الشحن", options: shipmentCarrierOptions },
      { name: "weight_kg", label: "الوزن كغ", type: "number", defaultValue: 0 },
      { name: "status", label: "حالة الشحنة", defaultValue: "قيد التحضير", options: shipmentStatusOptions },
      { name: "origin", label: "المنشأ" },
      { name: "destination", label: "الوجهة" },
      { name: "shipping_fee", label: "تكلفة الشحن الفعلية", type: "number", defaultValue: 0 },
      { name: "shipped_at", label: "تاريخ الشحن", type: "date" },
      { name: "delivered_at", label: "تاريخ التسليم", type: "date" },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
    columns: [
      { key: "tracking_number", label: "التتبع" },
      { key: "carrier", label: "الشركة" },
      { key: "status", label: "الحالة" },
      { key: "destination", label: "الوجهة" },
    ],
  },
  {
    key: "cars",
    title: "السيارات",
    description: "احفظ عروض السيارات، مصدرها، سعرها، والهامش المتوقع.",
    endpoint: "/cars",
    fields: [
      { name: "make", label: "الشركة", required: true },
      { name: "model", label: "الموديل", required: true },
      { name: "year", label: "السنة", type: "number" },
      { name: "source", label: "المصدر", options: carSourceOptions },
      { name: "specs", label: "المواصفات", type: "textarea" },
      { name: "price", label: "السعر", type: "number", defaultValue: 0 },
      { name: "currency", label: "العملة", defaultValue: "USD", options: currencyOptions },
      { name: "margin", label: "هامش الربح", type: "number", defaultValue: 0 },
      { name: "status", label: "الحالة", defaultValue: "متاحة", options: carStatusOptions },
    ],
    columns: [
      { key: "make", label: "الشركة" },
      { key: "model", label: "الموديل" },
      { key: "price", label: "السعر" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "wallets",
    title: "المحافظ",
    description: "أنشئ محافظ مثل KULTUR DZ أو KULTUR China أو USDT وتابع أرصدتها.",
    endpoint: "/accounting/wallets",
    fields: [
      { name: "name", label: "اسم المحفظة", required: true },
      { name: "currency", label: "العملة", defaultValue: "USD", options: currencyOptions },
      { name: "balance", label: "الرصيد الافتتاحي", type: "number", defaultValue: 0 },
      { name: "description", label: "الوصف", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "المحفظة" },
      { key: "currency", label: "العملة" },
      { key: "balance", label: "الرصيد" },
    ],
  },
  {
    key: "transactions",
    title: "الحركات المالية",
    description: "سجل الدخل والمصاريف والتحويلات. الرصيد يتغير تلقائيا حسب نوع الحركة.",
    endpoint: "/accounting/transactions",
    fields: [
      { name: "wallet_id", label: "رقم المحفظة", type: "number", required: true, help: "الرقم يظهر في جدول المحافظ." },
      { name: "type", label: "نوع الحركة", defaultValue: "income", options: transactionTypeOptions },
      { name: "amount", label: "المبلغ", type: "number", required: true },
      { name: "currency", label: "العملة", defaultValue: "USD", options: currencyOptions },
      { name: "category", label: "التصنيف", options: transactionCategoryOptions },
      { name: "description", label: "الوصف", type: "textarea" },
      { name: "occurred_at", label: "التاريخ", type: "date", required: true },
      { name: "related_order_id", label: "رقم الطلب", type: "number", help: "اختياري إذا كانت الحركة مرتبطة بطلب محدد." },
    ],
    columns: [
      { key: "type", label: "النوع" },
      { key: "amount", label: "المبلغ" },
      { key: "currency", label: "العملة" },
      { key: "category", label: "التصنيف" },
    ],
  },
  {
    key: "users",
    title: "المستخدمون",
    description: "هذه الصفحة لإضافة حسابات الموظفين فقط. اتركها لاحقا إذا لا تحتاجها الآن.",
    endpoint: "/users",
    fields: [
      { name: "email", label: "البريد الإلكتروني", type: "email", required: true },
      { name: "full_name", label: "الاسم", required: true },
      { name: "role_id", label: "رقم الدور", type: "number", required: true },
      { name: "password", label: "كلمة المرور", type: "password", required: true },
    ],
    columns: [
      { key: "email", label: "البريد" },
      { key: "full_name", label: "الاسم" },
      { key: "is_active", label: "مفعل" },
    ],
  },
];

const navItems = [
  ...resourceConfigs.map((resource) => ({ key: resource.key, label: resource.title })),
  { key: "imports", label: "استيراد ملف Excel" },
  { key: "audit", label: "سجل التغييرات" },
];

const brandImage = "/brand/kultur-export-logo.svg";

function defaultForm(fields: FieldConfig[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, String(field.defaultValue ?? "")]));
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }
  return String(value);
}

function buildPayload(fields: FieldConfig[], form: Record<string, string>): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const value = form[field.name];
    if (value === "" && !field.required) {
      return payload;
    }
    payload[field.name] = field.type === "number" ? Number(value) : value;
    return payload;
  }, {});
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function createDemoRecords(): Promise<void> {
  const demoCode = Date.now().toString().slice(-6);
  const suffix = `${new Date().toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} - ${demoCode}`;
  const customer = await api<ResourceRecord>("/crm/customers", {
    method: "POST",
    body: {
      name: `عميل تجريبي ${suffix}`,
      phone: "0550 123 456",
      source: "فيسبوك",
      status: "مهتم",
      interest: "استيراد سيارة وشحنها",
      notes: "هذا مثال للتجربة فقط، يمكن حذفه لاحقا.",
    },
  });
  const supplier = await api<ResourceRecord>("/orders/suppliers", {
    method: "POST",
    body: {
      name: `مورد تجريبي ${suffix}`,
      phone: "+86 138 0000 0000",
      country: "China",
      notes: "مورد للتجربة.",
    },
  });
  const wallet = await api<ResourceRecord>("/accounting/wallets", {
    method: "POST",
    body: {
      name: `KULTUR DZ مثال ${suffix}`,
      currency: "USD",
      balance: 0,
      description: "محفظة تجريبية لفهم المحاسبة.",
    },
  });
  const order = await api<ResourceRecord>("/orders", {
    method: "POST",
    body: {
      customer_id: customer.id,
      supplier_id: supplier.id,
      priority: "عاجلة",
      current_location: "عند المورد",
      product_name: "طلب تجريبي: قطع غيار سيارة",
      status: "قيد الشحن",
      currency: "USD",
      quantity: 3,
      unit_price: 120,
      shipping_fee: 45,
      notes: "الإجمالي يحسب تلقائيا: 3 × 120 + 45 = 405",
    },
  });
  await api<ResourceRecord>("/shipments", {
    method: "POST",
    body: {
      order_id: order.id,
      tracking_number: `KUL-${demoCode}`,
      carrier: "DHL",
      weight_kg: 18,
      status: "في الطريق",
      origin: "Guangzhou",
      destination: "Alger",
      shipping_fee: 45,
      shipped_at: todayIso(),
      notes: "شحنة تجريبية مرتبطة بالطلب.",
    },
  });
  await api<ResourceRecord>("/accounting/transactions", {
    method: "POST",
    body: {
      wallet_id: wallet.id,
      type: "income",
      amount: 405,
      currency: "USD",
      category: "طلب تجريبي",
      description: "دفعة العميل للطلب التجريبي.",
      occurred_at: todayIso(),
      related_order_id: order.id,
    },
  });
  await api<ResourceRecord>("/tasks", {
    method: "POST",
    body: {
      title: "مثال: تأكيد وصول الشحنة التجريبية",
      description: "راجع رقم التتبع وأبلغ العميل بالحالة.",
      status: "جديدة",
      priority: "عادية",
      due_date: todayIso(),
      customer_id: customer.id,
      order_id: order.id,
    },
  });
  await api<ResourceRecord>("/cars", {
    method: "POST",
    body: {
      customer_id: customer.id,
      order_id: order.id,
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      source: "Japan auction",
      specs: "مثال عرض سيارة للتجربة.",
      price: 9800,
      currency: "USD",
      margin: 700,
      status: "متاحة",
    },
  });
}

function LoginScreen({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [email, setEmail] = useState("admin@kultur-dz.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await login(email, password);
      setToken(response.access_token);
      onLogin(response.user, response.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-line">
          <img
            src={brandImage}
            alt="KULTUR EXPORT"
          />
          <div>
            <p className="eyebrow">KULTUR</p>
            <h1 id="login-title">برنامج إدارة KULTUR</h1>
          </div>
        </div>
        <form onSubmit={submit} className="stack-form">
          <label>
            البريد الإلكتروني
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            كلمة المرور
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit">دخول</button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({
  summary,
  onRefresh,
  onNavigate,
  onDemoCreate,
}: {
  summary: DashboardSummary | null;
  onRefresh: () => void;
  onNavigate: (key: string) => void;
  onDemoCreate: () => Promise<void>;
}) {
  const [demoStatus, setDemoStatus] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const countLabels: Record<string, string> = {
    tasks: "المهام",
    customers: "العملاء",
    orders: "الطلبات",
    shipments: "الشحنات",
    cars: "السيارات",
    wallets: "المحافظ",
  };

  async function addExamples() {
    setDemoBusy(true);
    setDemoStatus("");
    try {
      await onDemoCreate();
      setDemoStatus("تمت إضافة مثال كامل: عميل، مورد، طلب، شحنة، محفظة، حركة مالية، مهمة، وسيارة.");
    } catch (err) {
      setDemoStatus(err instanceof Error ? err.message : "تعذر إضافة المثال.");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <section className="workspace-section">
      <div className="dashboard-intro">
        <div className="intro-copy">
          <p className="eyebrow">ابدأ من هنا</p>
          <h2>العمل اليومي في KULTUR</h2>
          <p>
            هذه الصفحة تجمع الصورة العامة. عندما لا تعرف من أين تبدأ، اتبع المسار: عميل، طلب، شحنة، محاسبة.
          </p>
          <div className="quick-actions">
            <button type="button" onClick={() => onNavigate("customers")}>إضافة عميل</button>
            <button type="button" onClick={() => onNavigate("orders")}>تسجيل طلب</button>
            <button type="button" onClick={addExamples} disabled={demoBusy}>
              {demoBusy ? "جاري إضافة المثال..." : "أضف بيانات تجريبية"}
            </button>
            <button className="secondary" type="button" onClick={onRefresh}>تحديث الأرقام</button>
          </div>
          {demoStatus ? <p className={demoStatus.startsWith("تمت") ? "success-text" : "error-text"}>{demoStatus}</p> : null}
        </div>
        <img
          src={brandImage}
          alt="KULTUR EXPORT"
        />
      </div>
      <div className="guide-panel">
        <div>
          <h3>مثال سريع</h3>
          <p>
            عميل من فيسبوك طلب قطع غيار. نسجل الطلب والكمية والسعر، نضيف رقم التتبع في الشحن،
            ثم نسجل دفعة العميل في المحاسبة. بعد الضغط على زر البيانات التجريبية سترى هذا المثال موزعا في الصفحات.
          </p>
        </div>
        <div className="example-flow">
          <button type="button" onClick={() => onNavigate("customers")}>1. العميل</button>
          <button type="button" onClick={() => onNavigate("orders")}>2. الطلب</button>
          <button type="button" onClick={() => onNavigate("shipments")}>3. الشحنة</button>
          <button type="button" onClick={() => onNavigate("transactions")}>4. المحاسبة</button>
          <button className="secondary" type="button" onClick={() => onNavigate("imports")}>استيراد Excel</button>
        </div>
      </div>
      <div className="metric-grid">
        {Object.entries(summary?.counts ?? countLabels).map(([key, value]) => (
          <article className="metric" key={key}>
            <span>{countLabels[key] ?? key}</span>
            <strong>{typeof value === "number" ? value : 0}</strong>
          </article>
        ))}
      </div>
      <div className="split-grid">
        <section className="plain-block">
          <h3>إجمالي الطلبات حسب العملة</h3>
          <ul className="data-list">
            {(summary?.order_total_by_currency ?? []).map((item) => (
              <li key={item.currency}>
                <span>{item.currency}</span>
                <strong>{item.total}</strong>
              </li>
            ))}
            {(summary?.order_total_by_currency ?? []).length === 0 ? (
              <li>
                <span>لا توجد طلبات بعد</span>
                <strong>0</strong>
              </li>
            ) : null}
          </ul>
        </section>
        <section className="plain-block">
          <h3>أرصدة المحافظ</h3>
          <ul className="data-list">
            {(summary?.wallet_balances ?? []).map((wallet) => (
              <li key={`${wallet.name}-${wallet.currency}`}>
                <span>{wallet.name}</span>
                <strong>
                  {wallet.balance} {wallet.currency}
                </strong>
              </li>
            ))}
            {(summary?.wallet_balances ?? []).length === 0 ? (
              <li>
                <span>أضف محفظة أو بيانات تجريبية</span>
                <strong>0</strong>
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </section>
  );
}

function ResourcePanel({ config, onChanged }: { config: ResourceConfig; onChanged: () => void }) {
  const [items, setItems] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState(defaultForm(config.fields));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await api<ResourceRecord[]>(`${config.endpoint}${params}`);
    setItems(response);
  }, [config.endpoint, search]);

  useEffect(() => {
    setForm(defaultForm(config.fields));
    setEditingId(null);
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل البيانات"));
  }, [config, load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = buildPayload(config.fields, form);
      if (editingId) {
        await api<ResourceRecord>(`${config.endpoint}/${editingId}`, { method: "PATCH", body: payload });
      } else {
        await api<ResourceRecord>(config.endpoint, { method: "POST", body: payload });
      }
      setForm(defaultForm(config.fields));
      setEditingId(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ السجل");
    }
  }

  async function remove(item: ResourceRecord) {
    if (!item.id) return;
    setError("");
    try {
      await api(`${config.endpoint}/${item.id}`, { method: "DELETE" });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف السجل");
    }
  }

  function edit(item: ResourceRecord) {
    if (!item.id) return;
    setEditingId(item.id);
    setForm(
      Object.fromEntries(
        config.fields.map((field) => [field.name, item[field.name] === undefined || item[field.name] === null ? "" : String(item[field.name])]),
      ),
    );
  }

  return (
    <section className="workspace-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">صفحة عمل</p>
          <h2>{config.title}</h2>
          <p className="section-note">{config.description}</p>
        </div>
        <form className="search-form" onSubmit={(event) => { event.preventDefault(); load().catch(() => undefined); }}>
          <label>
            بحث
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button className="secondary" type="submit">تصفية</button>
        </form>
      </div>
      <form className="resource-form" onSubmit={submit}>
        {config.fields.map((field) => (
          <label key={field.name} className={field.type === "textarea" ? "wide-field" : undefined}>
            {field.label}
            {field.options ? (
              <select
                value={form[field.name] ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                required={field.required}
              >
                {!field.required ? <option value="">بدون اختيار</option> : null}
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={form[field.name] ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                placeholder={field.placeholder}
              />
            ) : (
              <input
                type={field.type ?? "text"}
                value={form[field.name] ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
            {field.help ? <span className="field-help">{field.help}</span> : null}
          </label>
        ))}
        <div className="form-actions">
          <button type="submit">{editingId ? "حفظ التعديل" : "إضافة"}</button>
          {editingId ? (
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(defaultForm(config.fields));
              }}
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>رقم</th>
              {config.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                {config.columns.map((column) => (
                  <td key={column.key}>{displayValue(item[column.key])}</td>
                ))}
                <td className="row-actions">
                  <button className="secondary" type="button" onClick={() => edit(item)}>تعديل</button>
                  <button className="danger" type="button" onClick={() => remove(item)}>حذف</button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length + 2}>لا توجد سجلات بعد</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TaskFormState = {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to_id: string;
  customer_id: string;
  order_id: string;
};

const blankTaskForm: TaskFormState = {
  title: "",
  description: "",
  status: "جديدة",
  priority: "عادية",
  due_date: "",
  assigned_to_id: "",
  customer_id: "",
  order_id: "",
};

function taskDueLabel(value: unknown): string {
  if (!value) return "بدون موعد";
  const due = new Date(String(value));
  const today = new Date();
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (dueStart < todayStart) return "متأخرة";
  if (dueStart === todayStart) return "اليوم";
  return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(due);
}

function taskDueClass(value: unknown): string {
  if (!value) return "due-neutral";
  const due = new Date(String(value));
  const today = new Date();
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (dueStart < todayStart) return "due-late";
  if (dueStart === todayStart) return "due-today";
  return "due-upcoming";
}

type CustomerFormState = {
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  interest: string;
  notes: string;
};

const blankCustomerForm: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  source: "",
  status: "مهتم",
  interest: "",
  notes: "",
};

function customerInitials(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!name) return "عميل";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function CustomersPage({ onChanged }: { onChanged: () => void }) {
  const [customers, setCustomers] = useState<ResourceRecord[]>([]);
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [tasks, setTasks] = useState<ResourceRecord[]>([]);
  const [shipments, setShipments] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<CustomerFormState>({ ...blankCustomerForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [customerRows, orderRows, taskRows, shipmentRows] = await Promise.all([
      api<ResourceRecord[]>("/crm/customers"),
      api<ResourceRecord[]>("/orders"),
      api<ResourceRecord[]>("/tasks"),
      api<ResourceRecord[]>("/shipments"),
    ]);
    setCustomers(customerRows);
    setOrders(orderRows);
    setTasks(taskRows);
    setShipments(shipmentRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل العملاء"));
  }, [load]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const status = String(customer.status ?? "مهتم");
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      return ["name", "phone", "email", "source", "status", "interest", "notes"].some((key) =>
        String(customer[key] ?? "").toLowerCase().includes(query),
      );
    });
  }, [customers, search, statusFilter]);

  function updateForm(field: keyof CustomerFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildCustomerPayload(): Record<string, unknown> {
    return {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      source: form.source || undefined,
      status: form.status || "مهتم",
      interest: form.interest || undefined,
      notes: form.notes || undefined,
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blankCustomerForm });
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/crm/customers/${editingId}`, { method: "PATCH", body: buildCustomerPayload() });
        setMessage("تم حفظ تعديل العميل.");
      } else {
        await api<ResourceRecord>("/crm/customers", { method: "POST", body: buildCustomerPayload() });
        setMessage("تمت إضافة العميل إلى المتابعة.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ العميل");
    }
  }

  async function patchCustomer(customerId: number, changes: Record<string, unknown>) {
    setError("");
    setMessage("");
    try {
      await api<ResourceRecord>(`/crm/customers/${customerId}`, { method: "PATCH", body: changes });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث العميل");
    }
  }

  async function removeCustomer(customerId: number) {
    if (!window.confirm("هل تريد حذف هذا العميل؟")) return;
    setError("");
    setMessage("");
    try {
      await api(`/crm/customers/${customerId}`, { method: "DELETE" });
      setMessage("تم حذف العميل.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف العميل");
    }
  }

  function editCustomer(customer: ResourceRecord) {
    setEditingId(Number(customer.id));
    setForm({
      name: String(customer.name ?? ""),
      phone: String(customer.phone ?? ""),
      email: String(customer.email ?? ""),
      source: String(customer.source ?? ""),
      status: String(customer.status ?? "مهتم"),
      interest: String(customer.interest ?? ""),
      notes: String(customer.notes ?? ""),
    });
  }

  function countByStatus(status: string): number {
    return customers.filter((customer) => String(customer.status ?? "مهتم") === status).length;
  }

  function customerOrders(customerId: unknown): ResourceRecord[] {
    return orders.filter((order) => Number(order.customer_id) === Number(customerId));
  }

  function customerOpenTasks(customerId: unknown, customerOrderIds: Set<number>): number {
    return tasks.filter((task) => {
      const belongsToCustomer = Number(task.customer_id) === Number(customerId);
      const belongsToOrder = customerOrderIds.has(Number(task.order_id));
      return (belongsToCustomer || belongsToOrder) && task.status !== "منتهية";
    }).length;
  }

  function customerRemainingAmount(customerRows: ResourceRecord[]): string {
    const totals = new Map<string, number>();
    customerRows.forEach((order) => {
      const currency = String(order.currency ?? "USD");
      totals.set(currency, (totals.get(currency) ?? 0) + Number(order.remaining_amount ?? 0));
    });
    const entries = Array.from(totals.entries()).filter(([, total]) => total > 0);
    return entries.length > 0 ? entries.map(([currency, total]) => `${total} ${currency}`).join("، ") : "0";
  }

  function latestCustomerShipment(customerOrderIds: Set<number>): string {
    const relatedShipments = shipments
      .filter((shipment) => customerOrderIds.has(Number(shipment.order_id)))
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
    const latestShipment = relatedShipments[0];
    if (!latestShipment) return "لا توجد شحنة";
    return `${displayValue(latestShipment.status)} · ${displayValue(latestShipment.tracking_number)}`;
  }

  return (
    <section className="workspace-section customers-page">
      <div className="customers-hero">
        <div>
          <p className="eyebrow">CRM</p>
          <h2>العملاء والمتابعة</h2>
          <p className="section-note">
            هذه الصفحة لتجميع كل العملاء والمهتمين في مكان واحد: من أين جاء العميل، ماذا يريد، وما هي حالته الآن.
          </p>
        </div>
        <div className="customer-pipeline" aria-label="مسار العميل">
          <span>مسار العميل</span>
          <ol>
            <li>مهتم</li>
            <li>تم التواصل</li>
            <li>عرض سعر</li>
            <li>عميل</li>
          </ol>
        </div>
      </div>

      <div className="customer-summary">
        <article>
          <span>كل العملاء</span>
          <strong>{customers.length}</strong>
        </article>
        <article>
          <span>مهتمون</span>
          <strong>{countByStatus("مهتم")}</strong>
        </article>
        <article>
          <span>تم التواصل</span>
          <strong>{countByStatus("تم التواصل")}</strong>
        </article>
        <article>
          <span>عملاء فعليون</span>
          <strong>{countByStatus("عميل")}</strong>
        </article>
      </div>

      <div className="customer-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل بيانات العميل" : "عميل جديد"}</h3>
            <p>املأ البيانات الأساسية، ثم تابع حالته من البطاقات.</p>
          </div>
          <form className="customer-form" onSubmit={saveCustomer}>
            <label>
              اسم العميل
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="مثال: أحمد بن علي" required />
            </label>
            <label>
              رقم الهاتف
              <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="مثال: 0550 123 456" />
            </label>
            <label>
              البريد الإلكتروني
              <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="name@example.com" />
            </label>
            <label>
              كيف وصل إلينا؟
              <select value={form.source} onChange={(event) => updateForm("source", event.target.value)}>
                <option value="">غير محدد</option>
                {customerSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.source && !customerSourceOptions.some((option) => option.value === form.source) ? (
                  <option value={form.source}>{form.source}</option>
                ) : null}
              </select>
            </label>
            <label>
              حالة العميل
              <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                {customerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.status && !customerStatusOptions.some((option) => option.value === form.status) ? (
                  <option value={form.status}>{form.status}</option>
                ) : null}
              </select>
            </label>
            <label>
              ماذا يريد؟
              <input value={form.interest} onChange={(event) => updateForm("interest", event.target.value)} placeholder="مثال: سيارة، شحن، منتج معين" />
            </label>
            <label className="wide-field">
              ملاحظات
              <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="آخر اتصال، السعر المطلوب، أو أي معلومة مهمة" />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل العميل" : "إضافة عميل"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">قائمة المتابعة</p>
              <h3>بطاقات العملاء</h3>
              <p>ابحث بالاسم أو الهاتف، ثم غيّر الحالة مباشرة من البطاقة.</p>
            </div>
            <div className="customer-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، هاتف، مصدر..." />
              </label>
              <label>
                الحالة
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">كل الحالات</option>
                  {customerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid">
            {filteredCustomers.map((customer) => {
              const phone = String(customer.phone ?? "").trim();
              const email = String(customer.email ?? "").trim();
              const source = String(customer.source ?? "").trim();
              const status = String(customer.status ?? "مهتم");
              const relatedOrders = customerOrders(customer.id);
              const relatedOrderIds = new Set(relatedOrders.map((order) => Number(order.id)));
              return (
                <article className="customer-card" key={String(customer.id)}>
                  <div className="customer-card-top">
                    <span className="customer-avatar">{customerInitials(customer.name)}</span>
                    <div>
                      <strong>{displayValue(customer.name)}</strong>
                      <span>{customer.interest ? displayValue(customer.interest) : "لم يحدد الاهتمام بعد"}</span>
                    </div>
                    <span className="customer-status">{status}</span>
                  </div>

                  <dl className="customer-meta">
                    <div>
                      <dt>الهاتف</dt>
                      <dd>{phone || "غير مسجل"}</dd>
                    </div>
                    <div>
                      <dt>المصدر</dt>
                      <dd>{source || "غير محدد"}</dd>
                    </div>
                    <div>
                      <dt>البريد</dt>
                      <dd>{email || "غير مسجل"}</dd>
                    </div>
                    <div>
                      <dt>الطلبات</dt>
                      <dd>{relatedOrders.length}</dd>
                    </div>
                    <div>
                      <dt>المتبقي</dt>
                      <dd>{customerRemainingAmount(relatedOrders)}</dd>
                    </div>
                    <div>
                      <dt>مهام مفتوحة</dt>
                      <dd>{customerOpenTasks(customer.id, relatedOrderIds)}</dd>
                    </div>
                    <div>
                      <dt>آخر شحنة</dt>
                      <dd>{latestCustomerShipment(relatedOrderIds)}</dd>
                    </div>
                  </dl>

                  {customer.notes ? <p className="customer-notes">{displayValue(customer.notes)}</p> : null}

                  <div className="customer-card-controls">
                    <label>
                      الحالة
                      <select
                        value={status}
                        onChange={(event) => {
                          if (customer.id) void patchCustomer(Number(customer.id), { status: event.target.value });
                        }}
                      >
                        {customerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        {status && !customerStatusOptions.some((option) => option.value === status) ? <option value={status}>{status}</option> : null}
                      </select>
                    </label>
                    <label>
                      المصدر
                      <select
                        value={source}
                        onChange={(event) => {
                          if (customer.id) void patchCustomer(Number(customer.id), { source: event.target.value || null });
                        }}
                      >
                        <option value="">غير محدد</option>
                        {customerSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        {source && !customerSourceOptions.some((option) => option.value === source) ? <option value={source}>{source}</option> : null}
                      </select>
                    </label>
                  </div>

                  <div className="row-actions">
                    {phone ? <a className="button-link" href={`tel:${phone}`}>اتصال</a> : null}
                    {email ? <a className="button-link secondary-link" href={`mailto:${email}`}>إيميل</a> : null}
                    <button className="secondary" type="button" onClick={() => editCustomer(customer)}>تعديل</button>
                    <button className="danger" type="button" onClick={() => customer.id ? removeCustomer(Number(customer.id)) : undefined}>حذف</button>
                  </div>
                </article>
              );
            })}
            {filteredCustomers.length === 0 ? (
              <p className="empty-customer-state">لا يوجد عميل مطابق للبحث الحالي. أضف عميلا جديدا أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type SupplierFormState = {
  name: string;
  phone: string;
  email: string;
  country: string;
  notes: string;
};

const blankSupplierForm: SupplierFormState = {
  name: "",
  phone: "",
  email: "",
  country: "",
  notes: "",
};

function SuppliersPage({ onChanged, onNavigate }: { onChanged: () => void; onNavigate: (key: string) => void }) {
  const [suppliers, setSuppliers] = useState<ResourceRecord[]>([]);
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<SupplierFormState>({ ...blankSupplierForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [supplierRows, orderRows] = await Promise.all([
      api<ResourceRecord[]>("/orders/suppliers"),
      api<ResourceRecord[]>("/orders"),
    ]);
    setSuppliers(supplierRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل الموردين"));
  }, [load]);

  const orderCountsBySupplier = useMemo(() => {
    const counts = new Map<number, number>();
    orders.forEach((order) => {
      const supplierId = Number(order.supplier_id);
      if (Number.isFinite(supplierId) && supplierId > 0) {
        counts.set(supplierId, (counts.get(supplierId) ?? 0) + 1);
      }
    });
    return counts;
  }, [orders]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const country = String(supplier.country ?? "");
      if (countryFilter !== "all" && country !== countryFilter) return false;
      if (!query) return true;
      return ["name", "phone", "email", "country", "notes"].some((key) =>
        String(supplier[key] ?? "").toLowerCase().includes(query),
      );
    });
  }, [countryFilter, search, suppliers]);

  function updateForm(field: keyof SupplierFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildSupplierPayload(): Record<string, unknown> {
    return {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      country: form.country || undefined,
      notes: form.notes || undefined,
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blankSupplierForm });
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/orders/suppliers/${editingId}`, { method: "PATCH", body: buildSupplierPayload() });
        setMessage("تم حفظ تعديل المورد.");
      } else {
        await api<ResourceRecord>("/orders/suppliers", { method: "POST", body: buildSupplierPayload() });
        setMessage("تمت إضافة المورد.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المورد");
    }
  }

  async function removeSupplier(supplierId: number) {
    if (!window.confirm("هل تريد حذف هذا المورد؟ الطلبات المرتبطة به قد تحتاج مراجعة.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/orders/suppliers/${supplierId}`, { method: "DELETE" });
      setMessage("تم حذف المورد.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف المورد");
    }
  }

  function editSupplier(supplier: ResourceRecord) {
    setEditingId(Number(supplier.id));
    setForm({
      name: String(supplier.name ?? ""),
      phone: String(supplier.phone ?? ""),
      email: String(supplier.email ?? ""),
      country: String(supplier.country ?? ""),
      notes: String(supplier.notes ?? ""),
    });
  }

  const linkedSupplierCount = suppliers.filter((supplier) => orderCountsBySupplier.has(Number(supplier.id))).length;
  const linkedOrderCount = orders.filter((order) => order.supplier_id).length;
  const missingCountryCount = suppliers.filter((supplier) => !supplier.country).length;

  return (
    <section className="workspace-section suppliers-page">
      <div className="customers-hero suppliers-hero">
        <div>
          <p className="eyebrow">الموردون والطلبات</p>
          <h2>موردون يمكن ربطهم بالطلبيات</h2>
          <p className="section-note">
            هذه الصفحة تحفظ الموردين الذين تتعامل معهم. عند إنشاء طلبية، تختار المورد من القائمة حتى يظهر مصدر الطلب وعدد الطلبيات المرتبطة به.
          </p>
        </div>
        <div className="customer-pipeline supplier-flow" aria-label="علاقة المورد بالطلب">
          <span>العلاقة داخل البرنامج</span>
          <ol>
            <li>مورد</li>
            <li>طلبية</li>
            <li>تجهيز</li>
            <li>شحن</li>
          </ol>
        </div>
      </div>

      <div className="customer-summary supplier-summary">
        <article>
          <span>كل الموردين</span>
          <strong>{suppliers.length}</strong>
        </article>
        <article>
          <span>موردون لديهم طلبيات</span>
          <strong>{linkedSupplierCount}</strong>
        </article>
        <article>
          <span>طلبيات مرتبطة</span>
          <strong>{linkedOrderCount}</strong>
        </article>
        <article>
          <span>بدون دولة</span>
          <strong>{missingCountryCount}</strong>
        </article>
      </div>

      <div className="customer-workspace supplier-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل بيانات المورد" : "مورد جديد"}</h3>
            <p>أضف المورد مرة واحدة، وبعدها اختره من صفحة الطلبات بدل كتابة اسمه في كل مرة.</p>
          </div>
          <form className="customer-form" onSubmit={saveSupplier}>
            <label>
              اسم المورد
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="مثال: Guangzhou Auto Parts" required />
            </label>
            <label>
              الدولة
              <select value={form.country} onChange={(event) => updateForm("country", event.target.value)}>
                <option value="">غير محددة</option>
                {supplierCountryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.country && !supplierCountryOptions.some((option) => option.value === form.country) ? (
                  <option value={form.country}>{form.country}</option>
                ) : null}
              </select>
            </label>
            <label>
              رقم الهاتف
              <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="+86 ..." />
            </label>
            <label>
              البريد الإلكتروني
              <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="supplier@example.com" />
            </label>
            <label className="wide-field">
              ملاحظات
              <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="نوع المنتجات، شروط الدفع، سرعة الرد، أو أي ملاحظة مهمة" />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل المورد" : "إضافة مورد"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">قائمة الموردين</p>
              <h3>بطاقات الموردين</h3>
              <p>كل بطاقة توضح بيانات المورد وعدد الطلبات المرتبطة به.</p>
            </div>
            <div className="customer-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، هاتف، دولة..." />
              </label>
              <label>
                الدولة
                <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
                  <option value="all">كل الدول</option>
                  {supplierCountryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid">
            {filteredSuppliers.map((supplier) => {
              const phone = String(supplier.phone ?? "").trim();
              const email = String(supplier.email ?? "").trim();
              const country = String(supplier.country ?? "").trim();
              const orderCount = orderCountsBySupplier.get(Number(supplier.id)) ?? 0;
              return (
                <article className="customer-card supplier-card" key={String(supplier.id)}>
                  <div className="customer-card-top">
                    <span className="customer-avatar supplier-avatar">{customerInitials(supplier.name)}</span>
                    <div>
                      <strong>{displayValue(supplier.name)}</strong>
                      <span>{country || "الدولة غير محددة"}</span>
                    </div>
                    <span className="customer-status supplier-status">{orderCount} طلب</span>
                  </div>

                  <dl className="customer-meta">
                    <div>
                      <dt>الهاتف</dt>
                      <dd>{phone || "غير مسجل"}</dd>
                    </div>
                    <div>
                      <dt>البريد</dt>
                      <dd>{email || "غير مسجل"}</dd>
                    </div>
                    <div>
                      <dt>الطلبيات</dt>
                      <dd>{orderCount > 0 ? `${orderCount} مرتبطة` : "لا توجد بعد"}</dd>
                    </div>
                  </dl>

                  {supplier.notes ? <p className="customer-notes">{displayValue(supplier.notes)}</p> : null}

                  <div className="row-actions">
                    {phone ? <a className="button-link" href={`tel:${phone}`}>اتصال</a> : null}
                    {email ? <a className="button-link secondary-link" href={`mailto:${email}`}>إيميل</a> : null}
                    <button className="secondary" type="button" onClick={() => editSupplier(supplier)}>تعديل</button>
                    <button className="secondary" type="button" onClick={() => onNavigate("orders")}>الطلبات</button>
                    <button className="danger" type="button" onClick={() => supplier.id ? removeSupplier(Number(supplier.id)) : undefined}>حذف</button>
                  </div>
                </article>
              );
            })}
            {filteredSuppliers.length === 0 ? (
              <p className="empty-customer-state">لا يوجد مورد مطابق للبحث الحالي. أضف موردا جديدا أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type ShipmentFormState = {
  order_id: string;
  tracking_number: string;
  carrier: string;
  weight_kg: string;
  status: string;
  origin: string;
  destination: string;
  shipping_fee: string;
  shipped_at: string;
  delivered_at: string;
  notes: string;
};

const blankShipmentForm: ShipmentFormState = {
  order_id: "",
  tracking_number: "",
  carrier: "",
  weight_kg: "0",
  status: "قيد التحضير",
  origin: "",
  destination: "",
  shipping_fee: "0",
  shipped_at: "",
  delivered_at: "",
  notes: "",
};

function normalizedShipmentStatus(value: unknown): string {
  const status = String(value ?? "قيد التحضير");
  return status === "pending" ? "قيد التحضير" : status;
}

function formatDate(value: unknown): string {
  if (!value) return "غير محدد";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(date);
}

function shipmentStatusClass(status: string): string {
  if (status === "متأخرة") return "shipment-status-late";
  if (status === "تم التسليم") return "shipment-status-delivered";
  if (status === "وصلت الجزائر") return "shipment-status-arrived";
  return "shipment-status-active";
}

function ShipmentsPage({ onChanged, onNavigate }: { onChanged: () => void; onNavigate: (key: string) => void }) {
  const [shipments, setShipments] = useState<ResourceRecord[]>([]);
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<ShipmentFormState>({ ...blankShipmentForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [shipmentRows, orderRows] = await Promise.all([
      api<ResourceRecord[]>("/shipments"),
      api<ResourceRecord[]>("/orders"),
    ]);
    setShipments(shipmentRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل الشحنات"));
  }, [load]);

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const status = normalizedShipmentStatus(shipment.status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      const orderName = orderLabel(shipment.order_id).toLowerCase();
      return orderName.includes(query) || ["tracking_number", "carrier", "status", "origin", "destination", "notes"].some((key) =>
        String(shipment[key] ?? "").toLowerCase().includes(query),
      );
    });
  }, [search, shipments, statusFilter, orders]);

  function orderLabel(orderId: unknown): string {
    const order = orders.find((item) => item.id === Number(orderId));
    if (!order) return orderId ? `طلبية رقم ${String(orderId)}` : "بدون طلبية";
    return `#${order.id} - ${displayValue(order.product_name)}`;
  }

  function updateForm(field: keyof ShipmentFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildShipmentPayload(): Record<string, unknown> {
    return {
      order_id: form.order_id ? Number(form.order_id) : undefined,
      tracking_number: form.tracking_number || undefined,
      carrier: form.carrier || undefined,
      weight_kg: Number(form.weight_kg || 0),
      status: form.status || "قيد التحضير",
      origin: form.origin || undefined,
      destination: form.destination || undefined,
      shipping_fee: Number(form.shipping_fee || 0),
      shipped_at: form.shipped_at || undefined,
      delivered_at: form.delivered_at || undefined,
      notes: form.notes || undefined,
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blankShipmentForm });
  }

  async function saveShipment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/shipments/${editingId}`, { method: "PATCH", body: buildShipmentPayload() });
        setMessage("تم حفظ تعديل الشحنة.");
      } else {
        await api<ResourceRecord>("/shipments", { method: "POST", body: buildShipmentPayload() });
        setMessage("تمت إضافة الشحنة.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الشحنة");
    }
  }

  async function patchShipment(shipmentId: number, changes: Record<string, unknown>) {
    setError("");
    setMessage("");
    try {
      await api<ResourceRecord>(`/shipments/${shipmentId}`, { method: "PATCH", body: changes });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث الشحنة");
    }
  }

  async function removeShipment(shipmentId: number) {
    if (!window.confirm("هل تريد حذف هذه الشحنة؟")) return;
    setError("");
    setMessage("");
    try {
      await api(`/shipments/${shipmentId}`, { method: "DELETE" });
      setMessage("تم حذف الشحنة.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف الشحنة");
    }
  }

  function editShipment(shipment: ResourceRecord) {
    setEditingId(Number(shipment.id));
    setForm({
      order_id: shipment.order_id ? String(shipment.order_id) : "",
      tracking_number: String(shipment.tracking_number ?? ""),
      carrier: String(shipment.carrier ?? ""),
      weight_kg: String(shipment.weight_kg ?? "0"),
      status: normalizedShipmentStatus(shipment.status),
      origin: String(shipment.origin ?? ""),
      destination: String(shipment.destination ?? ""),
      shipping_fee: String(shipment.shipping_fee ?? "0"),
      shipped_at: shipment.shipped_at ? String(shipment.shipped_at) : "",
      delivered_at: shipment.delivered_at ? String(shipment.delivered_at) : "",
      notes: String(shipment.notes ?? ""),
    });
  }

  function countByStatus(status: string): number {
    return shipments.filter((shipment) => normalizedShipmentStatus(shipment.status) === status).length;
  }

  const missingTrackingCount = shipments.filter((shipment) => !shipment.tracking_number).length;

  return (
    <section className="workspace-section shipments-page">
      <div className="customers-hero shipments-hero">
        <div>
          <p className="eyebrow">الشحن والمتابعة</p>
          <h2>من الطلبية إلى التسليم</h2>
          <p className="section-note">
            هنا تربط كل شحنة بطلبية، ثم تتابع شركة الشحن ورقم التتبع والمكان الحالي حتى يتم التسليم.
          </p>
        </div>
        <div className="customer-pipeline shipment-flow" aria-label="مسار الشحنة">
          <span>مسار الشحنة</span>
          <ol>
            <li>قيد التحضير</li>
            <li>في الطريق</li>
            <li>وصلت الجزائر</li>
            <li>تم التسليم</li>
          </ol>
        </div>
      </div>

      <div className="customer-summary shipment-summary">
        <article>
          <span>كل الشحنات</span>
          <strong>{shipments.length}</strong>
        </article>
        <article>
          <span>في الطريق</span>
          <strong>{countByStatus("في الطريق")}</strong>
        </article>
        <article>
          <span>تم التسليم</span>
          <strong>{countByStatus("تم التسليم")}</strong>
        </article>
        <article>
          <span>بدون رقم تتبع</span>
          <strong>{missingTrackingCount}</strong>
        </article>
      </div>

      <div className="customer-workspace shipment-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل بيانات الشحنة" : "شحنة جديدة"}</h3>
            <p>اختيار الطلبية من القائمة يجعل الشحنة مفهومة للفريق بدون البحث عن أرقام في جدول.</p>
          </div>
          <form className="customer-form shipment-form" onSubmit={saveShipment}>
            <label className="wide-field">
              الطلبية المرتبطة
              <select value={form.order_id} onChange={(event) => updateForm("order_id", event.target.value)}>
                <option value="">بدون طلبية</option>
                {orders.map((order) => <option key={String(order.id)} value={String(order.id)}>{orderLabel(order.id)}</option>)}
              </select>
            </label>
            <label>
              رقم التتبع
              <input value={form.tracking_number} onChange={(event) => updateForm("tracking_number", event.target.value)} placeholder="مثال: DHL123456" />
            </label>
            <label>
              شركة الشحن
              <select value={form.carrier} onChange={(event) => updateForm("carrier", event.target.value)}>
                <option value="">غير محددة</option>
                {shipmentCarrierOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.carrier && !shipmentCarrierOptions.some((option) => option.value === form.carrier) ? (
                  <option value={form.carrier}>{form.carrier}</option>
                ) : null}
              </select>
            </label>
            <label>
              حالة الشحنة
              <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                {shipmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.status && !shipmentStatusOptions.some((option) => option.value === form.status) ? (
                  <option value={form.status}>{form.status}</option>
                ) : null}
              </select>
            </label>
            <label>
              الوزن كغ
              <input type="number" value={form.weight_kg} onChange={(event) => updateForm("weight_kg", event.target.value)} min="0" />
            </label>
            <label>
              من أين؟
              <input value={form.origin} onChange={(event) => updateForm("origin", event.target.value)} placeholder="مثال: الصين" />
            </label>
            <label>
              إلى أين؟
              <input value={form.destination} onChange={(event) => updateForm("destination", event.target.value)} placeholder="مثال: الجزائر" />
            </label>
            <label>
              تكلفة الشحن الفعلية
              <input type="number" value={form.shipping_fee} onChange={(event) => updateForm("shipping_fee", event.target.value)} min="0" />
            </label>
            <label>
              تاريخ الشحن
              <input type="date" value={form.shipped_at} onChange={(event) => updateForm("shipped_at", event.target.value)} />
            </label>
            <label>
              تاريخ التسليم
              <input type="date" value={form.delivered_at} onChange={(event) => updateForm("delivered_at", event.target.value)} />
            </label>
            <label className="wide-field">
              ملاحظات
              <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="مثال: بانتظار رقم التتبع من المورد، أو تم الدفع للشركة" />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل الشحنة" : "إضافة شحنة"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">قائمة الشحنات</p>
              <h3>بطاقات الشحن</h3>
              <p>غيّر حالة الشحنة مباشرة، أو افتح الطلبات لمراجعة الطلبية المرتبطة.</p>
            </div>
            <div className="customer-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="تتبع، شركة، طلبية..." />
              </label>
              <label>
                الحالة
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">كل الحالات</option>
                  {shipmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid shipment-grid">
            {filteredShipments.map((shipment) => {
              const status = normalizedShipmentStatus(shipment.status);
              const carrier = String(shipment.carrier ?? "").trim();
              const trackingNumber = String(shipment.tracking_number ?? "").trim();
              return (
                <article className={`customer-card shipment-card ${shipmentStatusClass(status)}`} key={String(shipment.id)}>
                  <div className="customer-card-top">
                    <span className="customer-avatar shipment-avatar">شحن</span>
                    <div>
                      <strong>{trackingNumber || "شحنة بدون رقم تتبع"}</strong>
                      <span>{orderLabel(shipment.order_id)}</span>
                    </div>
                    <span className="customer-status shipment-status-badge">{status}</span>
                  </div>

                  <dl className="customer-meta">
                    <div>
                      <dt>شركة الشحن</dt>
                      <dd>{carrier || "غير محددة"}</dd>
                    </div>
                    <div>
                      <dt>المسار</dt>
                      <dd>{displayValue(shipment.origin)} ← {displayValue(shipment.destination)}</dd>
                    </div>
                    <div>
                      <dt>الوزن</dt>
                      <dd>{displayValue(shipment.weight_kg)} كغ</dd>
                    </div>
                    <div>
                      <dt>تكلفة الشحن</dt>
                      <dd>{displayValue(shipment.shipping_fee)}</dd>
                    </div>
                    <div>
                      <dt>تاريخ الشحن</dt>
                      <dd>{formatDate(shipment.shipped_at)}</dd>
                    </div>
                    <div>
                      <dt>تاريخ التسليم</dt>
                      <dd>{formatDate(shipment.delivered_at)}</dd>
                    </div>
                  </dl>

                  {shipment.notes ? <p className="customer-notes">{displayValue(shipment.notes)}</p> : null}

                  <div className="customer-card-controls">
                    <label>
                      الحالة
                      <select
                        value={status}
                        onChange={(event) => {
                          if (shipment.id) void patchShipment(Number(shipment.id), { status: event.target.value });
                        }}
                      >
                        {shipmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        {status && !shipmentStatusOptions.some((option) => option.value === status) ? <option value={status}>{status}</option> : null}
                      </select>
                    </label>
                    <label>
                      شركة الشحن
                      <select
                        value={carrier}
                        onChange={(event) => {
                          if (shipment.id) void patchShipment(Number(shipment.id), { carrier: event.target.value || null });
                        }}
                      >
                        <option value="">غير محددة</option>
                        {shipmentCarrierOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        {carrier && !shipmentCarrierOptions.some((option) => option.value === carrier) ? <option value={carrier}>{carrier}</option> : null}
                      </select>
                    </label>
                  </div>

                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => editShipment(shipment)}>تعديل</button>
                    <button className="secondary" type="button" onClick={() => onNavigate("orders")}>الطلبات</button>
                    <button className="danger" type="button" onClick={() => shipment.id ? removeShipment(Number(shipment.id)) : undefined}>حذف</button>
                  </div>
                </article>
              );
            })}
            {filteredShipments.length === 0 ? (
              <p className="empty-customer-state">لا توجد شحنة مطابقة للبحث الحالي. أضف شحنة جديدة أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type CarFormState = {
  customer_id: string;
  order_id: string;
  make: string;
  model: string;
  year: string;
  source: string;
  specs: string;
  price: string;
  currency: string;
  margin: string;
  status: string;
};

const blankCarForm: CarFormState = {
  customer_id: "",
  order_id: "",
  make: "",
  model: "",
  year: "",
  source: "",
  specs: "",
  price: "0",
  currency: "USD",
  margin: "0",
  status: "متاحة",
};

function normalizeCarStatus(value: unknown): string {
  const status = String(value ?? "متاحة");
  if (status === "available") return "متاحة";
  if (status === "reserved") return "محجوزة";
  if (status === "sold") return "مباعة";
  return status || "متاحة";
}

function carStatusClass(status: string): string {
  if (status === "مباعة") return "car-status-sold";
  if (status === "محجوزة") return "car-status-reserved";
  if (status === "قيد التفاوض") return "car-status-negotiation";
  return "car-status-available";
}

function CarsPage({ onChanged, onNavigate }: { onChanged: () => void; onNavigate: (key: string) => void }) {
  const [cars, setCars] = useState<ResourceRecord[]>([]);
  const [customers, setCustomers] = useState<ResourceRecord[]>([]);
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<CarFormState>({ ...blankCarForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [carRows, customerRows, orderRows] = await Promise.all([
      api<ResourceRecord[]>("/cars"),
      api<ResourceRecord[]>("/crm/customers"),
      api<ResourceRecord[]>("/orders"),
    ]);
    setCars(carRows);
    setCustomers(customerRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل السيارات"));
  }, [load]);

  const interestedCarCustomers = useMemo(() => (
    customers.filter((customer) => {
      const interest = String(customer.interest ?? "").toLowerCase();
      return interest.includes("سيار") || interest.includes("car");
    })
  ), [customers]);

  const filteredCars = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cars.filter((car) => {
      const status = normalizeCarStatus(car.status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      return ["make", "model", "year", "source", "specs", "price", "currency", "status"].some((key) =>
        String(car[key] ?? "").toLowerCase().includes(query),
      );
    });
  }, [cars, search, statusFilter]);

  function updateForm(field: keyof CarFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildCarPayload(): Record<string, unknown> {
    return {
      customer_id: form.customer_id ? Number(form.customer_id) : undefined,
      order_id: form.order_id ? Number(form.order_id) : undefined,
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : undefined,
      source: form.source || undefined,
      specs: form.specs || undefined,
      price: Number(form.price || 0),
      currency: form.currency || "USD",
      margin: Number(form.margin || 0),
      status: form.status || "متاحة",
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blankCarForm });
  }

  async function saveCar(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/cars/${editingId}`, { method: "PATCH", body: buildCarPayload() });
        setMessage("تم حفظ تعديل السيارة.");
      } else {
        await api<ResourceRecord>("/cars", { method: "POST", body: buildCarPayload() });
        setMessage("تمت إضافة عرض السيارة.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ السيارة");
    }
  }

  async function patchCar(carId: number, changes: Record<string, unknown>) {
    setError("");
    setMessage("");
    try {
      await api<ResourceRecord>(`/cars/${carId}`, { method: "PATCH", body: changes });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث السيارة");
    }
  }

  async function removeCar(carId: number) {
    if (!window.confirm("هل تريد حذف عرض السيارة؟")) return;
    setError("");
    setMessage("");
    try {
      await api(`/cars/${carId}`, { method: "DELETE" });
      setMessage("تم حذف عرض السيارة.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف السيارة");
    }
  }

  function editCar(car: ResourceRecord) {
    setEditingId(Number(car.id));
    setForm({
      customer_id: car.customer_id ? String(car.customer_id) : "",
      order_id: car.order_id ? String(car.order_id) : "",
      make: String(car.make ?? ""),
      model: String(car.model ?? ""),
      year: car.year ? String(car.year) : "",
      source: String(car.source ?? ""),
      specs: String(car.specs ?? ""),
      price: String(car.price ?? "0"),
      currency: String(car.currency ?? "USD"),
      margin: String(car.margin ?? "0"),
      status: normalizeCarStatus(car.status),
    });
  }

  function countByStatus(status: string): number {
    return cars.filter((car) => normalizeCarStatus(car.status) === status).length;
  }

  function customerName(customerId: unknown): string {
    const customer = customers.find((item) => item.id === Number(customerId));
    return customer ? displayValue(customer.name) : customerId ? `عميل رقم ${String(customerId)}` : "بدون عميل";
  }

  function orderName(orderId: unknown): string {
    const order = orders.find((item) => item.id === Number(orderId));
    return order ? `#${order.id} - ${displayValue(order.product_name)}` : orderId ? `طلبية رقم ${String(orderId)}` : "بدون طلبية";
  }

  async function convertCarToOrder(car: ResourceRecord) {
    if (car.order_id) {
      onNavigate("orders");
      return;
    }
    setError("");
    setMessage("");
    try {
      const salePrice = Number(car.price ?? 0) + Number(car.margin ?? 0);
      const order = await api<ResourceRecord>("/orders", {
        method: "POST",
        body: {
          customer_id: car.customer_id ? Number(car.customer_id) : undefined,
          product_name: `${displayValue(car.make)} ${displayValue(car.model)}`,
          status: "لم تبدأ",
          priority: "عادية",
          current_location: "لم تحدد",
          currency: String(car.currency ?? "USD"),
          quantity: 1,
          unit_price: salePrice,
          shipping_fee: 0,
          notes: "تم إنشاء هذه الطلبية من صفحة السيارات.",
        },
      });
      await api<ResourceRecord>(`/cars/${car.id}`, { method: "PATCH", body: { order_id: order.id, status: "محجوزة" } });
      setMessage("تم تحويل السيارة إلى طلبية وربطها بها.");
      await load();
      onChanged();
      onNavigate("orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحويل السيارة إلى طلبية");
    }
  }

  return (
    <section className="workspace-section cars-page">
      <div className="customers-hero cars-hero">
        <div>
          <p className="eyebrow">عروض السيارات</p>
          <h2>متابعة السيارات والربح المتوقع</h2>
          <p className="section-note">
            هذه الصفحة تحفظ السيارات المعروضة أو المقترحة للعملاء: السعر، الهامش، المصدر، والحالة. عندما يتأكد العميل، انتقل للطلبات وسجل الطلبية باسم السيارة.
          </p>
        </div>
        <div className="customer-pipeline car-flow" aria-label="مسار بيع السيارة">
          <span>مسار عرض السيارة</span>
          <ol>
            <li>متاحة</li>
            <li>قيد التفاوض</li>
            <li>محجوزة</li>
            <li>مباعة</li>
          </ol>
        </div>
      </div>

      <div className="customer-summary car-summary">
        <article>
          <span>كل السيارات</span>
          <strong>{cars.length}</strong>
        </article>
        <article>
          <span>متاحة</span>
          <strong>{countByStatus("متاحة")}</strong>
        </article>
        <article>
          <span>محجوزة</span>
          <strong>{countByStatus("محجوزة")}</strong>
        </article>
        <article>
          <span>عملاء مهتمون بسيارة</span>
          <strong>{interestedCarCustomers.length}</strong>
        </article>
      </div>

      <div className="customer-workspace car-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل عرض السيارة" : "عرض سيارة جديد"}</h3>
            <p>اكتب السعر والهامش بوضوح حتى يعرف الفريق قيمة العرض قبل تحويله إلى طلبية.</p>
          </div>
          <form className="customer-form car-form" onSubmit={saveCar}>
            <label>
              الشركة
              <input value={form.make} onChange={(event) => updateForm("make", event.target.value)} placeholder="Toyota" required />
            </label>
            <label>
              الموديل
              <input value={form.model} onChange={(event) => updateForm("model", event.target.value)} placeholder="Corolla" required />
            </label>
            <label>
              السنة
              <input type="number" value={form.year} onChange={(event) => updateForm("year", event.target.value)} placeholder="2022" />
            </label>
            <label>
              المصدر
              <select value={form.source} onChange={(event) => updateForm("source", event.target.value)}>
                <option value="">غير محدد</option>
                {carSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.source && !carSourceOptions.some((option) => option.value === form.source) ? (
                  <option value={form.source}>{form.source}</option>
                ) : null}
              </select>
            </label>
            <label>
              العميل المرتبط
              <select value={form.customer_id} onChange={(event) => updateForm("customer_id", event.target.value)}>
                <option value="">بدون عميل</option>
                {customers.map((customer) => <option key={String(customer.id)} value={String(customer.id)}>{displayValue(customer.name)}</option>)}
              </select>
            </label>
            <label>
              الطلبية المرتبطة
              <select value={form.order_id} onChange={(event) => updateForm("order_id", event.target.value)}>
                <option value="">بدون طلبية</option>
                {orders.map((order) => <option key={String(order.id)} value={String(order.id)}>{orderName(order.id)}</option>)}
              </select>
            </label>
            <label>
              السعر
              <input type="number" value={form.price} onChange={(event) => updateForm("price", event.target.value)} min="0" />
            </label>
            <label>
              العملة
              <select value={form.currency} onChange={(event) => updateForm("currency", event.target.value)}>
                {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              هامش الربح
              <input type="number" value={form.margin} onChange={(event) => updateForm("margin", event.target.value)} min="0" />
            </label>
            <label>
              الحالة
              <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                {carStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.status && !carStatusOptions.some((option) => option.value === form.status) ? (
                  <option value={form.status}>{form.status}</option>
                ) : null}
              </select>
            </label>
            <label className="wide-field">
              المواصفات
              <textarea value={form.specs} onChange={(event) => updateForm("specs", event.target.value)} placeholder="المحرك، الكيلومترات، اللون، التجهيزات، أو رابط الإعلان" />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل السيارة" : "إضافة سيارة"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">قائمة السيارات</p>
              <h3>بطاقات عروض السيارات</h3>
              <p>فلتر حسب الحالة، وحدث السيارة مباشرة عند الحجز أو البيع.</p>
            </div>
            <div className="customer-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="شركة، موديل، مصدر..." />
              </label>
              <label>
                الحالة
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">كل الحالات</option>
                  {carStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid car-grid">
            {filteredCars.map((car) => {
              const status = normalizeCarStatus(car.status);
              const source = String(car.source ?? "").trim();
              return (
                <article className={`customer-card car-card ${carStatusClass(status)}`} key={String(car.id)}>
                  <div className="customer-card-top">
                    <span className="customer-avatar car-avatar">CAR</span>
                    <div>
                      <strong>{displayValue(car.make)} {displayValue(car.model)}</strong>
                      <span>{car.year ? displayValue(car.year) : "السنة غير محددة"} · {source || "المصدر غير محدد"}</span>
                    </div>
                    <span className="customer-status car-status-badge">{status}</span>
                  </div>

                  <dl className="customer-meta">
                    <div>
                      <dt>السعر</dt>
                      <dd>{displayValue(car.price)} {displayValue(car.currency)}</dd>
                    </div>
                    <div>
                      <dt>الهامش</dt>
                      <dd>{displayValue(car.margin)} {displayValue(car.currency)}</dd>
                    </div>
                    <div>
                      <dt>إجمالي البيع المتوقع</dt>
                      <dd>{Number(car.price ?? 0) + Number(car.margin ?? 0)} {displayValue(car.currency)}</dd>
                    </div>
                    <div>
                      <dt>العميل</dt>
                      <dd>{customerName(car.customer_id)}</dd>
                    </div>
                    <div>
                      <dt>الطلبية</dt>
                      <dd>{orderName(car.order_id)}</dd>
                    </div>
                  </dl>

                  {car.specs ? <p className="customer-notes">{displayValue(car.specs)}</p> : null}

                  <div className="customer-card-controls">
                    <label>
                      الحالة
                      <select
                        value={status}
                        onChange={(event) => {
                          if (car.id) void patchCar(Number(car.id), { status: event.target.value });
                        }}
                      >
                        {carStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        {status && !carStatusOptions.some((option) => option.value === status) ? <option value={status}>{status}</option> : null}
                      </select>
                    </label>
                    <label>
                      العملة
                      <select
                        value={String(car.currency ?? "USD")}
                        onChange={(event) => {
                          if (car.id) void patchCar(Number(car.id), { currency: event.target.value });
                        }}
                      >
                        {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => editCar(car)}>تعديل</button>
                    <button className="secondary" type="button" onClick={() => onNavigate("customers")}>العملاء</button>
                    <button className="secondary" type="button" onClick={() => { void convertCarToOrder(car); }}>{car.order_id ? "فتح الطلبية" : "تحويل لطلبية"}</button>
                    <button className="danger" type="button" onClick={() => car.id ? removeCar(Number(car.id)) : undefined}>حذف</button>
                  </div>
                </article>
              );
            })}
            {filteredCars.length === 0 ? (
              <p className="empty-customer-state">لا توجد سيارة مطابقة للبحث الحالي. أضف عرض سيارة أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type WalletFormState = {
  name: string;
  currency: string;
  balance: string;
  description: string;
};

const blankWalletForm: WalletFormState = {
  name: "",
  currency: "USD",
  balance: "0",
  description: "",
};

function balanceClass(value: unknown): string {
  const balance = Number(value ?? 0);
  if (balance < 0) return "wallet-balance-negative";
  if (balance === 0) return "wallet-balance-zero";
  return "wallet-balance-positive";
}

function WalletsPage({ onChanged, onNavigate }: { onChanged: () => void; onNavigate: (key: string) => void }) {
  const [wallets, setWallets] = useState<ResourceRecord[]>([]);
  const [transactions, setTransactions] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<WalletFormState>({ ...blankWalletForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [walletRows, transactionRows] = await Promise.all([
      api<ResourceRecord[]>("/accounting/wallets"),
      api<ResourceRecord[]>("/accounting/transactions"),
    ]);
    setWallets(walletRows);
    setTransactions(transactionRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل المحافظ"));
  }, [load]);

  const balancesByCurrency = useMemo(() => {
    const balances = new Map<string, number>();
    wallets.forEach((wallet) => {
      const currency = String(wallet.currency ?? "USD");
      balances.set(currency, (balances.get(currency) ?? 0) + Number(wallet.balance ?? 0));
    });
    return Array.from(balances.entries()).map(([currency, total]) => ({ currency, total }));
  }, [wallets]);

  const transactionCountsByWallet = useMemo(() => {
    const counts = new Map<number, number>();
    transactions.forEach((transaction) => {
      [transaction.wallet_id, transaction.to_wallet_id].forEach((value) => {
        const walletId = Number(value);
        if (Number.isFinite(walletId) && walletId > 0) {
          counts.set(walletId, (counts.get(walletId) ?? 0) + 1);
        }
      });
    });
    return counts;
  }, [transactions]);

  const filteredWallets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return wallets.filter((wallet) => {
      const currency = String(wallet.currency ?? "USD");
      if (currencyFilter !== "all" && currency !== currencyFilter) return false;
      if (!query) return true;
      return ["name", "currency", "balance", "description"].some((key) =>
        String(wallet[key] ?? "").toLowerCase().includes(query),
      );
    });
  }, [currencyFilter, search, wallets]);

  function updateForm(field: keyof WalletFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildWalletPayload(): Record<string, unknown> {
    return {
      name: form.name,
      currency: form.currency || "USD",
      balance: Number(form.balance || 0),
      description: form.description || undefined,
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blankWalletForm });
  }

  async function saveWallet(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/accounting/wallets/${editingId}`, { method: "PATCH", body: buildWalletPayload() });
        setMessage("تم حفظ تعديل المحفظة.");
      } else {
        await api<ResourceRecord>("/accounting/wallets", { method: "POST", body: buildWalletPayload() });
        setMessage("تمت إضافة المحفظة.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المحفظة");
    }
  }

  async function removeWallet(walletId: number) {
    if (!window.confirm("هل تريد حذف هذه المحفظة؟ إذا كانت مرتبطة بحركات مالية قد يرفض النظام الحذف.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/accounting/wallets/${walletId}`, { method: "DELETE" });
      setMessage("تم حذف المحفظة.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف المحفظة");
    }
  }

  function editWallet(wallet: ResourceRecord) {
    setEditingId(Number(wallet.id));
    setForm({
      name: String(wallet.name ?? ""),
      currency: String(wallet.currency ?? "USD"),
      balance: String(wallet.balance ?? "0"),
      description: String(wallet.description ?? ""),
    });
  }

  const activeCurrencyCount = new Set(wallets.map((wallet) => String(wallet.currency ?? "USD"))).size;
  const positiveWalletCount = wallets.filter((wallet) => Number(wallet.balance ?? 0) > 0).length;
  const editingWalletTransactionCount = editingId ? transactionCountsByWallet.get(editingId) ?? 0 : 0;

  return (
    <section className="workspace-section wallets-page">
      <div className="customers-hero wallets-hero">
        <div>
          <p className="eyebrow">المحاسبة</p>
          <h2>المحافظ والأرصدة</h2>
          <p className="section-note">
            هذه الصفحة تحدد أين توجد الأموال: حساب بنكي، كاش، USDT، أو محفظة للشركة. الحركات المالية لاحقًا تزيد أو تنقص رصيد المحفظة حسب نوعها.
          </p>
        </div>
        <div className="wallet-balance-panel">
          <span>الأرصدة حسب العملة</span>
          <ul>
            {balancesByCurrency.map((item) => (
              <li key={item.currency}>
                <strong>{item.currency}</strong>
                <span>{item.total}</span>
              </li>
            ))}
            {balancesByCurrency.length === 0 ? (
              <li>
                <strong>لا توجد محافظ</strong>
                <span>0</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="customer-summary wallet-summary">
        <article>
          <span>كل المحافظ</span>
          <strong>{wallets.length}</strong>
        </article>
        <article>
          <span>عدد العملات</span>
          <strong>{activeCurrencyCount}</strong>
        </article>
        <article>
          <span>حركات مالية</span>
          <strong>{transactions.length}</strong>
        </article>
        <article>
          <span>أرصدة موجبة</span>
          <strong>{positiveWalletCount}</strong>
        </article>
      </div>

      <div className="customer-workspace wallet-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل المحفظة" : "محفظة جديدة"}</h3>
            <p>أنشئ المحفظة بالعملة الصحيحة. عند تسجيل حركة مالية، يجب أن تطابق عملتها عملة المحفظة.</p>
          </div>
          <form className="customer-form wallet-form" onSubmit={saveWallet}>
            <label>
              اسم المحفظة
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="مثال: KULTUR DZ / USDT / بنك" required />
            </label>
            <label>
              العملة
              <select value={form.currency} onChange={(event) => updateForm("currency", event.target.value)} disabled={editingWalletTransactionCount > 0}>
                {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {editingWalletTransactionCount > 0 ? <span className="field-help">لا يمكن تغيير عملة محفظة عليها حركات مالية.</span> : null}
            </label>
            <label>
              الرصيد الحالي
              <input type="number" value={form.balance} onChange={(event) => updateForm("balance", event.target.value)} disabled={editingWalletTransactionCount > 0} />
              {editingWalletTransactionCount > 0 ? <span className="field-help">الرصيد يتغير من الحركات المالية فقط.</span> : null}
            </label>
            <label className="wide-field">
              وصف المحفظة
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="مثال: كاش الجزائر، حساب بنكي، محفظة دفع للموردين" />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل المحفظة" : "إضافة محفظة"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">قائمة المحافظ</p>
              <h3>بطاقات الأرصدة</h3>
              <p>كل بطاقة تمثل مكانًا للأموال، وعدد الحركات المرتبطة به.</p>
            </div>
            <div className="customer-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، عملة، وصف..." />
              </label>
              <label>
                العملة
                <select value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)}>
                  <option value="all">كل العملات</option>
                  {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid wallet-grid">
            {filteredWallets.map((wallet) => {
              const transactionCount = transactionCountsByWallet.get(Number(wallet.id)) ?? 0;
              return (
                <article className={`customer-card wallet-card ${balanceClass(wallet.balance)}`} key={String(wallet.id)}>
                  <div className="customer-card-top">
                    <span className="customer-avatar wallet-avatar">{displayValue(wallet.currency)}</span>
                    <div>
                      <strong>{displayValue(wallet.name)}</strong>
                      <span>{wallet.description ? displayValue(wallet.description) : "بدون وصف"}</span>
                    </div>
                    <span className="customer-status wallet-status">{transactionCount} حركة</span>
                  </div>

                  <dl className="customer-meta">
                    <div>
                      <dt>الرصيد</dt>
                      <dd>{displayValue(wallet.balance)} {displayValue(wallet.currency)}</dd>
                    </div>
                    <div>
                      <dt>العملة</dt>
                      <dd>{displayValue(wallet.currency)}</dd>
                    </div>
                    <div>
                      <dt>الاستخدام</dt>
                      <dd>{transactionCount > 0 ? `${transactionCount} حركة مالية` : "لا توجد حركات بعد"}</dd>
                    </div>
                  </dl>

                  <p className="wallet-rule">الحركة المالية يجب أن تكون بنفس عملة هذه المحفظة.</p>

                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => editWallet(wallet)}>تعديل</button>
                    <button className="secondary" type="button" onClick={() => onNavigate("transactions")}>الحركات المالية</button>
                    <button className="danger" type="button" onClick={() => wallet.id ? removeWallet(Number(wallet.id)) : undefined}>حذف</button>
                  </div>
                </article>
              );
            })}
            {filteredWallets.length === 0 ? (
              <p className="empty-customer-state">لا توجد محفظة مطابقة للبحث الحالي. أضف محفظة أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type TransactionFormState = {
  wallet_id: string;
  to_wallet_id: string;
  type: string;
  amount: string;
  currency: string;
  category: string;
  description: string;
  occurred_at: string;
  related_order_id: string;
};

function blankTransactionForm(): TransactionFormState {
  return {
    wallet_id: "",
    to_wallet_id: "",
    type: "income",
    amount: "",
    currency: "USD",
    category: "",
    description: "",
    occurred_at: todayIso(),
    related_order_id: "",
  };
}

function transactionTypeLabel(value: unknown): string {
  return transactionTypeOptions.find((option) => option.value === value)?.label ?? displayValue(value);
}

function transactionTypeClass(value: unknown): string {
  if (value === "expense") return "transaction-type-expense";
  if (value === "transfer") return "transaction-type-transfer";
  return "transaction-type-income";
}

function transactionWalletFlow(transaction: ResourceRecord, walletName: (walletId: unknown) => string): string {
  if (transaction.type === "transfer") {
    return `${walletName(transaction.wallet_id)} ← ${walletName(transaction.to_wallet_id)}`;
  }
  return walletName(transaction.wallet_id);
}

function TransactionsPage({ onChanged, onNavigate }: { onChanged: () => void; onNavigate: (key: string) => void }) {
  const [transactions, setTransactions] = useState<ResourceRecord[]>([]);
  const [wallets, setWallets] = useState<ResourceRecord[]>([]);
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<TransactionFormState>(blankTransactionForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [walletFilter, setWalletFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [transactionRows, walletRows, orderRows] = await Promise.all([
      api<ResourceRecord[]>("/accounting/transactions"),
      api<ResourceRecord[]>("/accounting/wallets"),
      api<ResourceRecord[]>("/orders"),
    ]);
    setTransactions(transactionRows);
    setWallets(walletRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل الحركات المالية"));
  }, [load]);

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number; transfer: number }>();
    transactions.forEach((transaction) => {
      const currency = String(transaction.currency ?? "USD");
      const current = totals.get(currency) ?? { income: 0, expense: 0, transfer: 0 };
      const amount = Number(transaction.amount ?? 0);
      if (transaction.type === "expense") current.expense += amount;
      else if (transaction.type === "transfer") current.transfer += amount;
      else current.income += amount;
      totals.set(currency, current);
    });
    return Array.from(totals.entries()).map(([currency, total]) => ({ currency, ...total }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
      if (
        walletFilter !== "all" &&
        String(transaction.wallet_id) !== walletFilter &&
        String(transaction.to_wallet_id) !== walletFilter
      ) return false;
      if (!query) return true;
      const wallet = walletName(transaction.wallet_id).toLowerCase();
      const toWallet = walletName(transaction.to_wallet_id).toLowerCase();
      const order = orderName(transaction.related_order_id).toLowerCase();
      return wallet.includes(query) || toWallet.includes(query) || order.includes(query) || ["type", "amount", "currency", "category", "description"].some((key) =>
        String(transaction[key] ?? "").toLowerCase().includes(query),
      );
    });
  }, [search, transactions, typeFilter, walletFilter, wallets, orders]);

  function walletName(walletId: unknown): string {
    const wallet = wallets.find((item) => item.id === Number(walletId));
    if (!wallet) return walletId ? `محفظة رقم ${String(walletId)}` : "بدون محفظة";
    return `${displayValue(wallet.name)} - ${displayValue(wallet.currency)}`;
  }

  function walletCurrency(walletId: string): string {
    const wallet = wallets.find((item) => item.id === Number(walletId));
    return String(wallet?.currency ?? "USD");
  }

  function orderName(orderId: unknown): string {
    const order = orders.find((item) => item.id === Number(orderId));
    if (!order) return orderId ? `طلبية رقم ${String(orderId)}` : "بدون طلبية";
    return `#${order.id} - ${displayValue(order.product_name)}`;
  }

  function updateForm(field: keyof TransactionFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateWallet(value: string) {
    setForm((current) => ({
      ...current,
      wallet_id: value,
      currency: value ? walletCurrency(value) : current.currency,
      to_wallet_id: current.to_wallet_id === value ? "" : current.to_wallet_id,
    }));
  }

  function updateTransactionType(value: string) {
    setForm((current) => ({
      ...current,
      type: value,
      related_order_id: value === "transfer" ? "" : current.related_order_id,
      to_wallet_id: value === "transfer" ? current.to_wallet_id : "",
    }));
  }

  function buildTransactionPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      wallet_id: Number(form.wallet_id),
      type: form.type,
      amount: Number(form.amount || 0),
      currency: form.currency,
      category: form.category || undefined,
      description: form.description || undefined,
      occurred_at: form.occurred_at,
    };
    if (form.type === "transfer") {
      payload.to_wallet_id = Number(form.to_wallet_id);
      payload.related_order_id = null;
    } else if (form.related_order_id) {
      payload.to_wallet_id = null;
      payload.related_order_id = Number(form.related_order_id);
    } else {
      payload.to_wallet_id = null;
      payload.related_order_id = null;
    }
    return payload;
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankTransactionForm());
  }

  async function saveTransaction(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/accounting/transactions/${editingId}`, { method: "PATCH", body: buildTransactionPayload() });
        setMessage("تم حفظ تعديل الحركة المالية وتحديث رصيد المحفظة.");
      } else {
        await api<ResourceRecord>("/accounting/transactions", { method: "POST", body: buildTransactionPayload() });
        setMessage("تمت إضافة الحركة المالية وتحديث رصيد المحفظة.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الحركة المالية");
    }
  }

  async function removeTransaction(transactionId: number) {
    if (!window.confirm("هل تريد حذف هذه الحركة؟ سيتم عكس أثرها على رصيد المحفظة.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/accounting/transactions/${transactionId}`, { method: "DELETE" });
      setMessage("تم حذف الحركة وتحديث رصيد المحفظة.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف الحركة المالية");
    }
  }

  function editTransaction(transaction: ResourceRecord) {
    setEditingId(Number(transaction.id));
    setForm({
      wallet_id: String(transaction.wallet_id ?? ""),
      to_wallet_id: transaction.to_wallet_id ? String(transaction.to_wallet_id) : "",
      type: String(transaction.type ?? "income"),
      amount: String(transaction.amount ?? ""),
      currency: String(transaction.currency ?? "USD"),
      category: String(transaction.category ?? ""),
      description: String(transaction.description ?? ""),
      occurred_at: transaction.occurred_at ? String(transaction.occurred_at) : todayIso(),
      related_order_id: transaction.related_order_id ? String(transaction.related_order_id) : "",
    });
  }

  const incomeCount = transactions.filter((transaction) => transaction.type === "income").length;
  const expenseCount = transactions.filter((transaction) => transaction.type === "expense").length;
  const linkedOrderCount = transactions.filter((transaction) => transaction.related_order_id).length;

  return (
    <section className="workspace-section transactions-page">
      <div className="customers-hero transactions-hero">
        <div>
          <p className="eyebrow">المحاسبة اليومية</p>
          <h2>الحركات المالية</h2>
          <p className="section-note">
            أي دخل أو مصروف تسجله هنا يغير رصيد المحفظة تلقائيًا. اختر المحفظة أولًا، وستأخذ الحركة عملتها حتى لا يحدث خلط بين USD وDZD وUSDT.
          </p>
        </div>
        <div className="transaction-total-panel">
          <span>ملخص حسب العملة</span>
          <ul>
            {totalsByCurrency.map((item) => (
              <li key={item.currency}>
                <strong>{item.currency}</strong>
                <span>دخل {item.income} · مصروف {item.expense}</span>
              </li>
            ))}
            {totalsByCurrency.length === 0 ? (
              <li>
                <strong>لا توجد حركات</strong>
                <span>ابدأ بإضافة حركة</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="customer-summary transaction-summary">
        <article>
          <span>كل الحركات</span>
          <strong>{transactions.length}</strong>
        </article>
        <article>
          <span>دخل</span>
          <strong>{incomeCount}</strong>
        </article>
        <article>
          <span>مصروف</span>
          <strong>{expenseCount}</strong>
        </article>
        <article>
          <span>مرتبطة بطلبية</span>
          <strong>{linkedOrderCount}</strong>
        </article>
      </div>

      <div className="customer-workspace transaction-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل حركة مالية" : "حركة مالية جديدة"}</h3>
            <p>اختيار المحفظة يحدد العملة. الدخل يزيد الرصيد، والمصروف ينقصه.</p>
          </div>
          <form className="customer-form transaction-form" onSubmit={saveTransaction}>
            <label>
              المحفظة
              <select value={form.wallet_id} onChange={(event) => updateWallet(event.target.value)} required>
                <option value="">اختر محفظة</option>
                {wallets.map((wallet) => <option key={String(wallet.id)} value={String(wallet.id)}>{walletName(wallet.id)}</option>)}
              </select>
            </label>
            <label>
              نوع الحركة
              <select value={form.type} onChange={(event) => updateTransactionType(event.target.value)}>
                {transactionTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {form.type === "transfer" ? (
              <label>
                محفظة الوجهة
                <select value={form.to_wallet_id} onChange={(event) => updateForm("to_wallet_id", event.target.value)} required>
                  <option value="">اختر محفظة الوجهة</option>
                  {wallets
                    .filter((wallet) => String(wallet.id) !== form.wallet_id && String(wallet.currency ?? "USD") === form.currency)
                    .map((wallet) => <option key={String(wallet.id)} value={String(wallet.id)}>{walletName(wallet.id)}</option>)}
                </select>
                <span className="field-help">التحويل متاح فقط بين محافظ بنفس العملة.</span>
              </label>
            ) : null}
            <label>
              المبلغ
              <input type="number" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} min="0.01" step="0.01" required />
            </label>
            <label>
              العملة
              <select value={form.currency} onChange={(event) => updateForm("currency", event.target.value)} disabled={Boolean(form.wallet_id)}>
                {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <span className="field-help">تتبع عملة المحفظة المختارة.</span>
            </label>
            <label>
              التصنيف
              <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                <option value="">بدون تصنيف</option>
                {transactionCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                {form.category && !transactionCategoryOptions.some((option) => option.value === form.category) ? (
                  <option value={form.category}>{form.category}</option>
                ) : null}
              </select>
            </label>
            <label>
              التاريخ
              <input type="date" value={form.occurred_at} onChange={(event) => updateForm("occurred_at", event.target.value)} required />
            </label>
            {form.type !== "transfer" ? (
              <label className="wide-field">
              الطلبية المرتبطة
                <select value={form.related_order_id} onChange={(event) => updateForm("related_order_id", event.target.value)}>
                  <option value="">بدون طلبية</option>
                  {orders
                    .filter((order) => String(order.currency ?? "USD") === form.currency)
                    .map((order) => <option key={String(order.id)} value={String(order.id)}>{orderName(order.id)}</option>)}
                </select>
                <span className="field-help">تظهر فقط الطلبات التي تطابق عملة المحفظة.</span>
              </label>
            ) : null}
            <label className="wide-field">
              الوصف
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="مثال: دفعة مقدمة من العميل، دفع شحن، أو دفع للمورد" />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل الحركة" : "إضافة حركة"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">سجل مالي</p>
              <h3>بطاقات الحركات</h3>
              <p>فلتر حسب النوع أو المحفظة، وراجع أثر كل حركة بوضوح.</p>
            </div>
            <div className="transaction-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="محفظة، طلبية، تصنيف..." />
              </label>
              <label>
                النوع
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="all">كل الأنواع</option>
                  {transactionTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                المحفظة
                <select value={walletFilter} onChange={(event) => setWalletFilter(event.target.value)}>
                  <option value="all">كل المحافظ</option>
                  {wallets.map((wallet) => <option key={String(wallet.id)} value={String(wallet.id)}>{walletName(wallet.id)}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid transaction-grid">
            {filteredTransactions.map((transaction) => (
              <article className={`customer-card transaction-card ${transactionTypeClass(transaction.type)}`} key={String(transaction.id)}>
                <div className="customer-card-top">
                  <span className="customer-avatar transaction-avatar">{transactionTypeLabel(transaction.type)}</span>
                  <div>
                    <strong>{displayValue(transaction.amount)} {displayValue(transaction.currency)}</strong>
                    <span>{transactionWalletFlow(transaction, walletName)}</span>
                  </div>
                  <span className="customer-status transaction-status">{transactionTypeLabel(transaction.type)}</span>
                </div>

                <dl className="customer-meta">
                  <div>
                    <dt>التصنيف</dt>
                    <dd>{displayValue(transaction.category)}</dd>
                  </div>
                  <div>
                    <dt>التاريخ</dt>
                    <dd>{formatDate(transaction.occurred_at)}</dd>
                  </div>
                  <div>
                    <dt>{transaction.type === "transfer" ? "الوجهة" : "الطلبية"}</dt>
                    <dd>{transaction.type === "transfer" ? walletName(transaction.to_wallet_id) : orderName(transaction.related_order_id)}</dd>
                  </div>
                </dl>

                {transaction.description ? <p className="customer-notes">{displayValue(transaction.description)}</p> : null}

                <div className="row-actions">
                  <button className="secondary" type="button" onClick={() => editTransaction(transaction)}>تعديل</button>
                  <button className="secondary" type="button" onClick={() => onNavigate("wallets")}>المحافظ</button>
                  {transaction.related_order_id ? <button className="secondary" type="button" onClick={() => onNavigate("orders")}>الطلبات</button> : null}
                  <button className="danger" type="button" onClick={() => transaction.id ? removeTransaction(Number(transaction.id)) : undefined}>حذف</button>
                </div>
              </article>
            ))}
            {filteredTransactions.length === 0 ? (
              <p className="empty-customer-state">لا توجد حركة مالية مطابقة للبحث الحالي. أضف حركة جديدة أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type UserFormState = {
  email: string;
  full_name: string;
  role_id: string;
  is_active: string;
  password: string;
};

const blankUserForm: UserFormState = {
  email: "",
  full_name: "",
  role_id: "",
  is_active: "true",
  password: "",
};

function roleToneClass(slug: unknown): string {
  if (slug === "accountant") return "role-accountant";
  if (slug === "shipping") return "role-shipping";
  if (slug === "sales") return "role-sales";
  if (slug === "executive") return "role-executive";
  return "role-admin";
}

function UsersPage({ onChanged }: { onChanged: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<UserFormState>({ ...blankUserForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [userRows, roleRows] = await Promise.all([
      api<User[]>("/users"),
      api<Role[]>("/users/roles"),
    ]);
    setUsers(userRows);
    setRoles(roleRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل المستخدمين"));
  }, [load]);

  useEffect(() => {
    if (roles.length === 0 || editingId || form.role_id) return;
    setForm((current) => current.role_id ? current : { ...current, role_id: String(roles[0].id) });
  }, [editingId, form.role_id, roles]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((userRow) => {
      const roleSlug = userRow.role?.slug ?? "";
      if (roleFilter !== "all" && roleSlug !== roleFilter) return false;
      if (statusFilter === "active" && !userRow.is_active) return false;
      if (statusFilter === "inactive" && userRow.is_active) return false;
      if (!query) return true;
      return [userRow.full_name, userRow.email, userRow.role?.name, userRow.role?.description].some((value) =>
        String(value ?? "").toLowerCase().includes(query),
      );
    });
  }, [roleFilter, search, statusFilter, users]);

  function updateForm(field: keyof UserFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildUserPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      email: form.email,
      full_name: form.full_name,
      role_id: Number(form.role_id),
      is_active: form.is_active === "true",
    };
    if (form.password) {
      payload.password = form.password;
    }
    return payload;
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blankUserForm, role_id: roles[0] ? String(roles[0].id) : "" });
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!editingId && !form.password) {
      setError("اكتب كلمة مرور مؤقتة للمستخدم الجديد.");
      return;
    }
    try {
      if (editingId) {
        await api<User>(`/users/${editingId}`, { method: "PATCH", body: buildUserPayload() });
        setMessage("تم حفظ تعديل المستخدم.");
      } else {
        await api<User>("/users", { method: "POST", body: buildUserPayload() });
        setMessage("تمت إضافة المستخدم.");
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المستخدم");
    }
  }

  async function deactivateUser(userId: number) {
    if (!window.confirm("هل تريد تعطيل هذا المستخدم؟ لن يستطيع الدخول حتى تعيد تفعيله.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/users/${userId}`, { method: "DELETE" });
      setMessage("تم تعطيل المستخدم.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تعطيل المستخدم");
    }
  }

  async function reactivateUser(userId: number) {
    setError("");
    setMessage("");
    try {
      await api<User>(`/users/${userId}`, { method: "PATCH", body: { is_active: true } });
      setMessage("تم تفعيل المستخدم.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تفعيل المستخدم");
    }
  }

  function editUser(userRow: User) {
    setEditingId(userRow.id);
    setForm({
      email: userRow.email,
      full_name: userRow.full_name,
      role_id: userRow.role ? String(userRow.role.id) : "",
      is_active: String(userRow.is_active),
      password: "",
    });
  }

  const activeCount = users.filter((userRow) => userRow.is_active).length;
  const inactiveCount = users.length - activeCount;
  const adminCount = users.filter((userRow) => userRow.role?.slug === "admin").length;

  return (
    <section className="workspace-section users-page">
      <div className="customers-hero users-hero">
        <div>
          <p className="eyebrow">إدارة الفريق</p>
          <h2>المستخدمون والصلاحيات</h2>
          <p className="section-note">
            هذه الصفحة لإضافة الموظفين وتحديد دور كل واحد. الدور يحدد ما يستطيع المستخدم فتحه أو تعديله داخل البرنامج.
          </p>
        </div>
        <div className="role-guide">
          <span>الأدوار المتاحة</span>
          <div>
            {roles.map((role) => (
              <article className={roleToneClass(role.slug)} key={role.id}>
                <strong>{role.name}</strong>
                <p>{role.description ?? "بدون وصف"}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="customer-summary user-summary">
        <article>
          <span>كل المستخدمين</span>
          <strong>{users.length}</strong>
        </article>
        <article>
          <span>مفعلون</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>معطلون</span>
          <strong>{inactiveCount}</strong>
        </article>
        <article>
          <span>مديرون</span>
          <strong>{adminCount}</strong>
        </article>
      </div>

      <div className="customer-workspace user-workspace">
        <section className="customer-form-panel">
          <div className="panel-title">
            <p className="eyebrow">{editingId ? "تعديل" : "إضافة"}</p>
            <h3>{editingId ? "تعديل مستخدم" : "مستخدم جديد"}</h3>
            <p>أضف الموظف، اختر دوره من القائمة، ثم أعطه كلمة مرور مؤقتة يغيرها لاحقًا.</p>
          </div>
          <form className="customer-form user-form" onSubmit={saveUser}>
            <label>
              الاسم الكامل
              <input value={form.full_name} onChange={(event) => updateForm("full_name", event.target.value)} placeholder="مثال: محمد علي" required />
            </label>
            <label>
              البريد الإلكتروني
              <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="name@kultur.com" required />
            </label>
            <label>
              الدور
              <select value={form.role_id} onChange={(event) => updateForm("role_id", event.target.value)} required>
                <option value="">اختر الدور</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <label>
              الحالة
              <select value={form.is_active} onChange={(event) => updateForm("is_active", event.target.value)}>
                <option value="true">مفعل</option>
                <option value="false">معطل</option>
              </select>
            </label>
            <label className="wide-field">
              كلمة المرور
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                placeholder={editingId ? "اتركها فارغة إذا لا تريد تغييرها" : "كلمة مرور مؤقتة"}
                required={!editingId}
              />
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? "حفظ تعديل المستخدم" : "إضافة مستخدم"}</button>
              {editingId ? <button className="secondary" type="button" onClick={resetForm}>إلغاء</button> : null}
            </div>
          </form>
        </section>

        <section className="customer-list-panel">
          <div className="customer-toolbar">
            <div>
              <p className="eyebrow">قائمة الفريق</p>
              <h3>بطاقات المستخدمين</h3>
              <p>راجع من لديه صلاحية الدخول، وعدّل الدور أو عطّل الحساب عند الحاجة.</p>
            </div>
            <div className="user-filters">
              <label>
                بحث
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، بريد، دور..." />
              </label>
              <label>
                الدور
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                  <option value="all">كل الأدوار</option>
                  {roles.map((role) => <option key={role.id} value={role.slug}>{role.name}</option>)}
                </select>
              </label>
              <label>
                الحالة
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">كل الحالات</option>
                  <option value="active">مفعل</option>
                  <option value="inactive">معطل</option>
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <div className="customer-grid user-grid">
            {filteredUsers.map((userRow) => {
              const role = userRow.role;
              return (
                <article className={`customer-card user-card ${roleToneClass(role?.slug)} ${userRow.is_active ? "" : "user-inactive"}`} key={userRow.id}>
                  <div className="customer-card-top">
                    <span className="customer-avatar user-avatar">{customerInitials(userRow.full_name)}</span>
                    <div>
                      <strong>{userRow.full_name}</strong>
                      <span>{userRow.email}</span>
                    </div>
                    <span className="customer-status user-status">{userRow.is_active ? "مفعل" : "معطل"}</span>
                  </div>

                  <dl className="customer-meta">
                    <div>
                      <dt>الدور</dt>
                      <dd>{role?.name ?? "بدون دور"}</dd>
                    </div>
                    <div>
                      <dt>الصلاحية</dt>
                      <dd>{role?.description ?? "بدون وصف"}</dd>
                    </div>
                    <div>
                      <dt>آخر تعديل</dt>
                      <dd>{formatDate(userRow.updated_at)}</dd>
                    </div>
                  </dl>

                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => editUser(userRow)}>تعديل</button>
                    {userRow.is_active ? (
                      <button className="danger" type="button" onClick={() => deactivateUser(userRow.id)}>تعطيل</button>
                    ) : (
                      <button type="button" onClick={() => reactivateUser(userRow.id)}>تفعيل</button>
                    )}
                  </div>
                </article>
              );
            })}
            {filteredUsers.length === 0 ? (
              <p className="empty-customer-state">لا يوجد مستخدم مطابق للبحث الحالي. أضف مستخدمًا أو غيّر الفلترة.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function TasksBoard({ onChanged }: { onChanged: () => void }) {
  const [tasks, setTasks] = useState<ResourceRecord[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [customers, setCustomers] = useState<ResourceRecord[]>([]);
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<TaskFormState>(blankTaskForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [taskRows, staffRows, customerRows, orderRows] = await Promise.all([
      api<ResourceRecord[]>("/tasks"),
      api<User[]>("/users/staff"),
      api<ResourceRecord[]>("/crm/customers"),
      api<ResourceRecord[]>("/orders"),
    ]);
    setTasks(taskRows);
    setStaff(staffRows);
    setCustomers(customerRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل المهام"));
  }, [load]);

  function updateForm(field: keyof TaskFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildTaskPayload(): Record<string, unknown> {
    return {
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || undefined,
      assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : undefined,
      customer_id: form.customer_id ? Number(form.customer_id) : undefined,
      order_id: form.order_id ? Number(form.order_id) : undefined,
    };
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/tasks/${editingId}`, { method: "PATCH", body: buildTaskPayload() });
        setMessage("تم تعديل المهمة.");
      } else {
        await api<ResourceRecord>("/tasks", { method: "POST", body: buildTaskPayload() });
        setMessage("تمت إضافة المهمة.");
      }
      setForm(blankTaskForm);
      setEditingId(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المهمة");
    }
  }

  async function patchTask(taskId: number, changes: Record<string, unknown>) {
    setError("");
    await api<ResourceRecord>(`/tasks/${taskId}`, { method: "PATCH", body: changes });
    await load();
    onChanged();
  }

  async function removeTask(taskId: number) {
    setError("");
    await api(`/tasks/${taskId}`, { method: "DELETE" });
    await load();
    onChanged();
  }

  function editTask(task: ResourceRecord) {
    setEditingId(Number(task.id));
    setForm({
      title: String(task.title ?? ""),
      description: String(task.description ?? ""),
      status: String(task.status ?? "جديدة"),
      priority: String(task.priority ?? "عادية"),
      due_date: task.due_date ? String(task.due_date) : "",
      assigned_to_id: task.assigned_to_id ? String(task.assigned_to_id) : "",
      customer_id: task.customer_id ? String(task.customer_id) : "",
      order_id: task.order_id ? String(task.order_id) : "",
    });
  }

  function staffName(id: unknown): string {
    return staff.find((member) => member.id === Number(id))?.full_name ?? "بدون مسؤول";
  }

  function customerName(id: unknown): string {
    const customer = customers.find((item) => item.id === Number(id));
    return customer ? displayValue(customer.name) : id ? `عميل رقم ${String(id)}` : "بدون عميل";
  }

  function orderName(id: unknown): string {
    const order = orders.find((item) => item.id === Number(id));
    return order ? `#${order.id} - ${displayValue(order.product_name)}` : id ? `طلبية رقم ${String(id)}` : "بدون طلبية";
  }

  const lateCount = tasks.filter((task) => task.status !== "منتهية" && taskDueClass(task.due_date) === "due-late").length;
  const todayCount = tasks.filter((task) => task.status !== "منتهية" && taskDueClass(task.due_date) === "due-today").length;

  return (
    <section className="workspace-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">تنظيم العمل اليومي</p>
          <h2>لوحة المهام</h2>
          <p className="section-note">
            هذه الصفحة للمتابعات الصغيرة: اتصال، مراجعة مورد، إرسال رقم تتبع، أو تذكير محاسبي. الطلبية تبقى في صفحة الطلبات، والمهام تضمن أن لا يضيع أي عمل.
          </p>
        </div>
      </div>
      <div className="task-summary">
        <article>
          <span>كل المهام</span>
          <strong>{tasks.length}</strong>
        </article>
        <article>
          <span>موعدها اليوم</span>
          <strong>{todayCount}</strong>
        </article>
        <article>
          <span>متأخرة</span>
          <strong>{lateCount}</strong>
        </article>
      </div>
      <form className="task-control-panel" onSubmit={saveTask}>
        <label className="wide-field">
          ما هي المهمة؟
          <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="مثال: اتصل بالعميل لتأكيد الطلبية" required />
        </label>
        <label>
          المسؤول
          <select value={form.assigned_to_id} onChange={(event) => updateForm("assigned_to_id", event.target.value)}>
            <option value="">بدون مسؤول</option>
            {staff.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
          </select>
        </label>
        <label>
          الحالة
          <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
            {taskStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          الأولوية
          <select value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>
            {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          الموعد النهائي
          <input type="date" value={form.due_date} onChange={(event) => updateForm("due_date", event.target.value)} />
        </label>
        <label>
          العميل المرتبط
          <select value={form.customer_id} onChange={(event) => updateForm("customer_id", event.target.value)}>
            <option value="">بدون عميل</option>
            {customers.map((customer) => <option key={String(customer.id)} value={String(customer.id)}>{displayValue(customer.name)}</option>)}
          </select>
        </label>
        <label>
          الطلبية المرتبطة
          <select value={form.order_id} onChange={(event) => updateForm("order_id", event.target.value)}>
            <option value="">بدون طلبية</option>
            {orders.map((order) => <option key={String(order.id)} value={String(order.id)}>{orderName(order.id)}</option>)}
          </select>
        </label>
        <label className="wide-field">
          تفاصيل
          <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="اكتب أي معلومة تساعد المسؤول على تنفيذ المهمة" />
        </label>
        <div className="form-actions">
          <button type="submit">{editingId ? "حفظ تعديل المهمة" : "إضافة مهمة"}</button>
          {editingId ? (
            <button className="secondary" type="button" onClick={() => { setEditingId(null); setForm(blankTaskForm); }}>
              إلغاء
            </button>
          ) : null}
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      <div className="task-board">
        {taskStatusOptions.map((column) => {
          const columnTasks = tasks.filter((task) => {
            const status = String(task.status ?? "جديدة");
            const knownStatus = taskStatusOptions.some((option) => option.value === status);
            return status === column.value || (column.value === "جديدة" && !knownStatus);
          });
          return (
            <section className="task-column" key={column.value}>
              <div className="board-column-title">
                <h3>{column.label}</h3>
                <span>{columnTasks.length}</span>
              </div>
              {columnTasks.map((task) => (
                <article className={`task-card priority-${String(task.priority ?? "عادية")}`} key={String(task.id)}>
                  <div className="task-card-header">
                    <strong>{displayValue(task.title)}</strong>
                    <span className={taskDueClass(task.due_date)}>{taskDueLabel(task.due_date)}</span>
                  </div>
                  {task.description ? <p>{displayValue(task.description)}</p> : null}
                  <dl>
                    <div>
                      <dt>المسؤول</dt>
                      <dd>{staffName(task.assigned_to_id)}</dd>
                    </div>
                    <div>
                      <dt>الأولوية</dt>
                      <dd>{displayValue(task.priority)}</dd>
                    </div>
                    <div>
                      <dt>الطلبية</dt>
                      <dd>{orderName(task.order_id)}</dd>
                    </div>
                    <div>
                      <dt>العميل</dt>
                      <dd>{customerName(task.customer_id)}</dd>
                    </div>
                  </dl>
                  <div className="card-selects">
                    <label>
                      الحالة
                      <select value={String(task.status ?? "جديدة")} onChange={(event) => patchTask(Number(task.id), { status: event.target.value })}>
                        {taskStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      المسؤول
                      <select value={task.assigned_to_id ? String(task.assigned_to_id) : ""} onChange={(event) => patchTask(Number(task.id), { assigned_to_id: event.target.value ? Number(event.target.value) : null })}>
                        <option value="">بدون مسؤول</option>
                        {staff.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                      </select>
                    </label>
                    <label>
                      الأولوية
                      <select value={String(task.priority ?? "عادية")} onChange={(event) => patchTask(Number(task.id), { priority: event.target.value })}>
                        {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => editTask(task)}>تعديل</button>
                    <button className="danger" type="button" onClick={() => removeTask(Number(task.id))}>حذف</button>
                  </div>
                </article>
              ))}
              {columnTasks.length === 0 ? <p className="empty-column">لا توجد مهام هنا</p> : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

type OrderFormState = {
  product_name: string;
  customer_id: string;
  supplier_id: string;
  assigned_to_id: string;
  priority: string;
  current_location: string;
  status: string;
  currency: string;
  quantity: string;
  unit_price: string;
  shipping_fee: string;
  notes: string;
};

const blankOrderForm: OrderFormState = {
  product_name: "",
  customer_id: "",
  supplier_id: "",
  assigned_to_id: "",
  priority: "عادية",
  current_location: "لم تحدد",
  status: "لم تبدأ",
  currency: "USD",
  quantity: "1",
  unit_price: "0",
  shipping_fee: "0",
  notes: "",
};

function OrdersBoard({ onChanged }: { onChanged: () => void }) {
  const [orders, setOrders] = useState<ResourceRecord[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [customers, setCustomers] = useState<ResourceRecord[]>([]);
  const [suppliers, setSuppliers] = useState<ResourceRecord[]>([]);
  const [shipments, setShipments] = useState<ResourceRecord[]>([]);
  const [transactions, setTransactions] = useState<ResourceRecord[]>([]);
  const [tasks, setTasks] = useState<ResourceRecord[]>([]);
  const [form, setForm] = useState<OrderFormState>(blankOrderForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [orderRows, staffRows, customerRows, supplierRows, shipmentRows, transactionRows, taskRows] = await Promise.all([
      api<ResourceRecord[]>("/orders"),
      api<User[]>("/users/staff"),
      api<ResourceRecord[]>("/crm/customers"),
      api<ResourceRecord[]>("/orders/suppliers"),
      api<ResourceRecord[]>("/shipments"),
      api<ResourceRecord[]>("/accounting/transactions"),
      api<ResourceRecord[]>("/tasks"),
    ]);
    setOrders(orderRows);
    setStaff(staffRows);
    setCustomers(customerRows);
    setSuppliers(supplierRows);
    setShipments(shipmentRows);
    setTransactions(transactionRows);
    setTasks(taskRows);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل الطلبات"));
  }, [load]);

  function updateForm(field: keyof OrderFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildOrderPayload(): Record<string, unknown> {
    return {
      product_name: form.product_name,
      customer_id: form.customer_id ? Number(form.customer_id) : undefined,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : undefined,
      assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : undefined,
      priority: form.priority,
      current_location: form.current_location,
      status: form.status,
      currency: form.currency,
      quantity: Number(form.quantity || 1),
      unit_price: Number(form.unit_price || 0),
      shipping_fee: Number(form.shipping_fee || 0),
      notes: form.notes || undefined,
    };
  }

  async function saveOrder(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api<ResourceRecord>(`/orders/${editingId}`, { method: "PATCH", body: buildOrderPayload() });
        setMessage("تم تعديل الطلبية.");
      } else {
        await api<ResourceRecord>("/orders", { method: "POST", body: buildOrderPayload() });
        setMessage("تمت إضافة الطلبية.");
      }
      setForm(blankOrderForm);
      setEditingId(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الطلبية");
    }
  }

  async function patchOrder(orderId: number, changes: Record<string, unknown>) {
    setError("");
    await api<ResourceRecord>(`/orders/${orderId}`, { method: "PATCH", body: changes });
    await load();
    onChanged();
  }

  async function removeOrder(orderId: number) {
    setError("");
    await api(`/orders/${orderId}`, { method: "DELETE" });
    await load();
    onChanged();
  }

  function editOrder(order: ResourceRecord) {
    setEditingId(Number(order.id));
    setForm({
      product_name: String(order.product_name ?? ""),
      customer_id: order.customer_id ? String(order.customer_id) : "",
      supplier_id: order.supplier_id ? String(order.supplier_id) : "",
      assigned_to_id: order.assigned_to_id ? String(order.assigned_to_id) : "",
      priority: String(order.priority ?? "عادية"),
      current_location: String(order.current_location ?? "لم تحدد"),
      status: String(order.status ?? "لم تبدأ"),
      currency: String(order.currency ?? "USD"),
      quantity: String(order.quantity ?? "1"),
      unit_price: String(order.unit_price ?? "0"),
      shipping_fee: String(order.shipping_fee ?? "0"),
      notes: String(order.notes ?? ""),
    });
  }

  function staffName(id: unknown): string {
    return staff.find((member) => member.id === Number(id))?.full_name ?? "بدون مسؤول";
  }

  function customerName(id: unknown): string {
    const customer = customers.find((item) => item.id === Number(id));
    return customer ? displayValue(customer.name) : id ? `عميل رقم ${String(id)}` : "بدون عميل";
  }

  function supplierName(id: unknown): string {
    const supplier = suppliers.find((item) => item.id === Number(id));
    return supplier ? displayValue(supplier.name) : id ? `مورد رقم ${String(id)}` : "بدون مورد";
  }

  function countLinked(rows: ResourceRecord[], orderId: unknown): number {
    return rows.filter((row) => Number(row.order_id ?? row.related_order_id) === Number(orderId)).length;
  }

  return (
    <section className="workspace-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">لوحة متابعة</p>
          <h2>الطلبات مثل Trello</h2>
          <p className="section-note">
            كل طلبية تظهر كبطاقة. غير الحالة أو المسؤول أو الأولوية من القوائم، وستنتقل البطاقة للعمود المناسب.
          </p>
        </div>
      </div>
      <form className="order-control-panel" onSubmit={saveOrder}>
        <label className="wide-field">
          اسم الطلبية
          <input value={form.product_name} onChange={(event) => updateForm("product_name", event.target.value)} required />
        </label>
        <label>
          العميل
          <select value={form.customer_id} onChange={(event) => updateForm("customer_id", event.target.value)}>
            <option value="">بدون اختيار</option>
            {customers.map((customer) => (
              <option key={String(customer.id)} value={String(customer.id)}>{displayValue(customer.name)}</option>
            ))}
          </select>
        </label>
        <label>
          المورد
          <select value={form.supplier_id} onChange={(event) => updateForm("supplier_id", event.target.value)}>
            <option value="">بدون اختيار</option>
            {suppliers.map((supplier) => (
              <option key={String(supplier.id)} value={String(supplier.id)}>{displayValue(supplier.name)}</option>
            ))}
          </select>
        </label>
        <label>
          المسؤول
          <select value={form.assigned_to_id} onChange={(event) => updateForm("assigned_to_id", event.target.value)}>
            <option value="">بدون مسؤول</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          الأولوية
          <select value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>
            {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          أين الطلبية؟
          <select value={form.current_location} onChange={(event) => updateForm("current_location", event.target.value)}>
            {orderLocationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          هل بدأنا فيها؟
          <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
            {orderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          العملة
          <select value={form.currency} onChange={(event) => updateForm("currency", event.target.value)}>
            {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          الكمية
          <input type="number" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} min="1" />
        </label>
        <label>
          سعر الوحدة
          <input type="number" value={form.unit_price} onChange={(event) => updateForm("unit_price", event.target.value)} min="0" />
        </label>
        <label>
          رسوم الشحن على العميل
          <input type="number" value={form.shipping_fee} onChange={(event) => updateForm("shipping_fee", event.target.value)} min="0" />
        </label>
        <label className="wide-field">
          ملاحظات
          <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit">{editingId ? "حفظ تعديل الطلبية" : "إضافة طلبية"}</button>
          {editingId ? (
            <button className="secondary" type="button" onClick={() => { setEditingId(null); setForm(blankOrderForm); }}>
              إلغاء
            </button>
          ) : null}
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      <div className="trello-board">
        {orderStatusOptions.map((column) => {
          const columnOrders = orders.filter((order) => {
            const status = String(order.status ?? "لم تبدأ");
            const knownStatus = orderStatusOptions.some((option) => option.value === status);
            return status === column.value || (column.value === "لم تبدأ" && !knownStatus);
          });
          return (
            <section className="board-column" key={column.value}>
              <div className="board-column-title">
                <h3>{column.label}</h3>
                <span>{columnOrders.length}</span>
              </div>
              {columnOrders.map((order) => (
                <article className={`order-card priority-${String(order.priority ?? "عادية")}`} key={String(order.id)}>
                  <div className="order-card-header">
                    <strong>{displayValue(order.product_name)}</strong>
                    <span>{displayValue(order.total_price)} {displayValue(order.currency)}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>العميل</dt>
                      <dd>{customerName(order.customer_id)}</dd>
                    </div>
                    <div>
                      <dt>المورد</dt>
                      <dd>{supplierName(order.supplier_id)}</dd>
                    </div>
                    <div>
                      <dt>المسؤول</dt>
                      <dd>{staffName(order.assigned_to_id)}</dd>
                    </div>
                    <div>
                      <dt>الأولوية</dt>
                      <dd>{displayValue(order.priority)}</dd>
                    </div>
                    <div>
                      <dt>المكان</dt>
                      <dd>{displayValue(order.current_location)}</dd>
                    </div>
                    <div>
                      <dt>المدفوع</dt>
                      <dd>{displayValue(order.paid_amount)} {displayValue(order.currency)}</dd>
                    </div>
                    <div>
                      <dt>المتبقي</dt>
                      <dd>{displayValue(order.remaining_amount)} {displayValue(order.currency)}</dd>
                    </div>
                    <div>
                      <dt>حالة الدفع</dt>
                      <dd>{displayValue(order.payment_status)}</dd>
                    </div>
                    <div>
                      <dt>ترابطات</dt>
                      <dd>{countLinked(shipments, order.id)} شحنات · {countLinked(transactions, order.id)} حركات · {countLinked(tasks, order.id)} مهام</dd>
                    </div>
                  </dl>
                  <div className="card-selects">
                    <label>
                      الحالة
                      <select value={String(order.status ?? "لم تبدأ")} onChange={(event) => patchOrder(Number(order.id), { status: event.target.value })}>
                        {orderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      المسؤول
                      <select value={order.assigned_to_id ? String(order.assigned_to_id) : ""} onChange={(event) => patchOrder(Number(order.id), { assigned_to_id: event.target.value ? Number(event.target.value) : null })}>
                        <option value="">بدون مسؤول</option>
                        {staff.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                      </select>
                    </label>
                    <label>
                      الأولوية
                      <select value={String(order.priority ?? "عادية")} onChange={(event) => patchOrder(Number(order.id), { priority: event.target.value })}>
                        {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      مكان الطلبية
                      <select value={String(order.current_location ?? "لم تحدد")} onChange={(event) => patchOrder(Number(order.id), { current_location: event.target.value })}>
                        {orderLocationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => editOrder(order)}>تعديل التفاصيل</button>
                    <button className="danger" type="button" onClick={() => removeOrder(Number(order.id))}>حذف</button>
                  </div>
                </article>
              ))}
              {columnOrders.length === 0 ? <p className="empty-column">لا توجد طلبات هنا</p> : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ImportPanel({ onChanged }: { onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("customers");
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedTarget = importTargets[target];
  const requiredFields = selectedTarget.fields.filter((field) => field.required);
  const missingRequiredFields = preview ? requiredFields.filter((field) => !columnMap[field.key]) : [];
  const mappedFieldsCount = selectedTarget.fields.filter((field) => columnMap[field.key]).length;
  const targetEntries = Object.entries(importTargets);

  useEffect(() => {
    if (!preview) {
      setColumnMap({});
      return;
    }
    setColumnMap(
      Object.fromEntries(
        selectedTarget.fields.map((field) => [field.key, guessColumn(preview.headers, field.aliases)]),
      ),
    );
  }, [preview, selectedTarget.fields]);

  async function previewFile() {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    data.append("max_rows", "10");
    setMessage("");
    setError("");
    try {
      setPreview(await api<ImportPreview>("/imports/preview", { method: "POST", body: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر قراءة الملف");
    }
  }

  async function commitFile() {
    if (!file) return;
    const missing = selectedTarget.fields.filter((field) => field.required && !columnMap[field.key]);
    if (missing.length > 0) {
      setError(`اختر عمودا للحقل المطلوب: ${missing.map((field) => field.label).join("، ")}`);
      return;
    }
    const data = new FormData();
    data.append("file", file);
    data.append("target_module", target);
    data.append("column_map", JSON.stringify(columnMap));
    setError("");
    try {
      const batch = await api<{ successful_rows: number; failed_rows: number }>("/imports/commit", { method: "POST", body: data });
      setMessage(`تم الاستيراد: ${batch.successful_rows} صف ناجح، ${batch.failed_rows} صف مرفوض`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الاستيراد");
    }
  }

  return (
    <section className="workspace-section imports-page">
      <div className="customers-hero imports-hero">
        <div>
          <p className="eyebrow">Excel أو CSV</p>
          <h2>استيراد بيانات Google Sheet</h2>
          <p className="section-note">
            استخدم هذه الصفحة مرة واحدة غالبًا لنقل البيانات القديمة إلى البرنامج. اختر نوع البيانات، ارفع الملف، اربط الأعمدة، ثم احفظ.
          </p>
        </div>
        <div className="import-steps" aria-label="خطوات الاستيراد">
          <span>طريقة العمل</span>
          <ol>
            <li>اختر نوع الملف</li>
            <li>ارفع Excel أو CSV</li>
            <li>اربط الأعمدة</li>
            <li>احفظ البيانات</li>
          </ol>
        </div>
      </div>

      <div className="customer-summary import-summary">
        <article>
          <span>نوع البيانات</span>
          <strong>{selectedTarget.label}</strong>
        </article>
        <article>
          <span>الملف</span>
          <strong>{file ? "جاهز" : "لم يرفع"}</strong>
        </article>
        <article>
          <span>حقول مطلوبة</span>
          <strong>{requiredFields.length}</strong>
        </article>
        <article>
          <span>أعمدة مربوطة</span>
          <strong>{preview ? mappedFieldsCount : 0}</strong>
        </article>
      </div>

      <div className="import-workspace">
        <section className="import-control-panel">
          <div className="panel-title">
            <p className="eyebrow">الخطوة الأولى</p>
            <h3>ماذا تريد أن تستورد؟</h3>
            <p>اختر الصفحة التي ستذهب إليها البيانات بعد الحفظ.</p>
          </div>
          <div className="import-target-grid">
            {targetEntries.map(([key, option]) => (
              <button
                className={target === key ? "import-target-card active" : "import-target-card"}
                key={key}
                type="button"
                onClick={() => {
                  setTarget(key);
                  setPreview(null);
                  setMessage("");
                  setError("");
                }}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
          <div className="import-upload-panel">
            <label>
              الملف
              <input type="file" accept=".csv,.xlsx,.xlsm" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} />
            </label>
            <p>{file ? `الملف المختار: ${file.name}` : "اختر ملف CSV أو Excel من جهازك."}</p>
          </div>
          <div className="form-actions">
            <button type="button" onClick={previewFile} disabled={!file}>معاينة الملف</button>
            <button className="secondary" type="button" onClick={commitFile} disabled={!file || !preview || missingRequiredFields.length > 0}>
              حفظ الاستيراد
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}
        </section>

        <section className="import-help-panel">
          <p className="eyebrow">بعد الحفظ</p>
          <h3>أين تذهب البيانات؟</h3>
          <p>إذا اخترت العملاء ستظهر السجلات في صفحة العملاء، وإذا اخترت الطلبات ستظهر في لوحة الطلبات. الصفوف غير المفهومة يرفضها النظام برسالة خطأ بدل إدخال بيانات خاطئة.</p>
          <div className="import-hint-list">
            <span>نصيحة: جرّب ملفًا صغيرًا أولًا.</span>
            <span>لا تغيّر البيانات الأصلية في Google Sheet حتى تتأكد من النتيجة.</span>
          </div>
        </section>
      </div>

      {preview ? (
        <>
          <section className="mapping-panel">
            <div className="mapping-heading">
              <div>
                <p className="eyebrow">الخطوة الثالثة</p>
                <h3>ربط الأعمدة</h3>
                <p>إذا لم يعرف البرنامج العمود تلقائيًا، اختره من القائمة. الحقول التي عليها نجمة مطلوبة.</p>
              </div>
              <span className={missingRequiredFields.length === 0 ? "mapping-status ready" : "mapping-status"}>
                {missingRequiredFields.length === 0 ? "جاهز للحفظ" : `ينقص ${missingRequiredFields.length}`}
              </span>
            </div>
            <div className="mapping-grid">
              {selectedTarget.fields.map((field) => (
                <label key={field.key}>
                  {field.label}{field.required ? " *" : ""}
                  <select
                    value={columnMap[field.key] ?? ""}
                    onChange={(event) => setColumnMap((current) => ({ ...current, [field.key]: event.target.value }))}
                    required={field.required}
                  >
                    <option value="">لا يوجد</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {missingRequiredFields.length > 0 ? (
              <p className="error-text">اربط الحقول المطلوبة: {missingRequiredFields.map((field) => field.label).join("، ")}</p>
            ) : null}
          </section>
          <div className="preview-panel">
            <div className="mapping-heading">
              <div>
                <p className="eyebrow">معاينة</p>
                <h3>{preview.filename}</h3>
                <p>هذه عينة من الملف قبل الحفظ. إذا كانت الأعمدة صحيحة، اضغط حفظ الاستيراد.</p>
              </div>
            </div>
            <div className="table-wrap">
            <table>
              <thead>
                <tr>{preview.headers.map((header) => <th key={header}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={`${preview.filename}-${index}`}>
                    {preview.headers.map((header) => <td key={header}>{displayValue(row[header])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

const auditActionLabels: Record<string, string> = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  update_balance: "تحديث رصيد",
};

const auditEntityLabels: Record<string, string> = {
  CarListing: "السيارات",
  Customer: "العملاء",
  ImportBatch: "الاستيراد",
  Order: "الطلبات",
  Shipment: "الشحن",
  Supplier: "الموردون",
  Task: "المهام",
  Transaction: "الحركات المالية",
  User: "المستخدمون",
  Wallet: "المحافظ",
};

function auditActionLabel(value: string): string {
  return auditActionLabels[value] ?? value;
}

function auditEntityLabel(value: string): string {
  return auditEntityLabels[value] ?? value;
}

function auditActionClass(value: string): string {
  if (value === "delete") return "audit-action-delete";
  if (value === "update" || value === "update_balance") return "audit-action-update";
  return "audit-action-create";
}

function AuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    api<AuditLog[]>("/audit")
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل سجل التدقيق"));
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!query) return true;
      return [
        auditActionLabel(log.action),
        auditEntityLabel(log.entity_type),
        log.entity_id,
        log.actor_id,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [actionFilter, logs, search]);

  const createCount = logs.filter((log) => log.action === "create").length;
  const updateCount = logs.filter((log) => log.action === "update" || log.action === "update_balance").length;
  const deleteCount = logs.filter((log) => log.action === "delete").length;

  return (
    <section className="workspace-section audit-page">
      <div className="customers-hero audit-hero">
        <div>
          <p className="eyebrow">للمراجعة</p>
          <h2>سجل التغييرات</h2>
          <p className="section-note">هنا يظهر من أضاف أو عدل أو حذف سجلًا. هذه الصفحة تساعد المدير على معرفة ما حدث داخل البرنامج ومتى حدث.</p>
        </div>
        <div className="audit-explainer">
          <span>كيف تقرأ السجل؟</span>
          <p>كل بطاقة تعني عملية واحدة: إضافة، تعديل، حذف، أو تحديث رصيد. رقم السجل يساعد المطور أو المدير في التتبع عند الحاجة.</p>
        </div>
      </div>

      <div className="customer-summary audit-summary">
        <article>
          <span>كل العمليات</span>
          <strong>{logs.length}</strong>
        </article>
        <article>
          <span>إضافات</span>
          <strong>{createCount}</strong>
        </article>
        <article>
          <span>تعديلات</span>
          <strong>{updateCount}</strong>
        </article>
        <article>
          <span>حذف</span>
          <strong>{deleteCount}</strong>
        </article>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="audit-toolbar">
        <div>
          <p className="eyebrow">فلترة</p>
          <h3>ابحث في العمليات</h3>
          <p>فلتر حسب نوع العملية أو اسم الصفحة المتأثرة.</p>
        </div>
        <div className="audit-filters">
          <label>
            بحث
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="عملية، صفحة، رقم سجل..." />
          </label>
          <label>
            نوع العملية
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="all">كل العمليات</option>
              <option value="create">إضافة</option>
              <option value="update">تعديل</option>
              <option value="update_balance">تحديث رصيد</option>
              <option value="delete">حذف</option>
            </select>
          </label>
        </div>
      </section>

      <div className="audit-timeline">
        {filteredLogs.map((log) => (
          <article className={`audit-card ${auditActionClass(log.action)}`} key={log.id}>
            <div className="audit-card-top">
              <span>{auditActionLabel(log.action)}</span>
              <div>
                <strong>{auditEntityLabel(log.entity_type)}</strong>
                <p>سجل رقم {log.entity_id}</p>
              </div>
              <time>{new Date(log.created_at).toLocaleString("ar-DZ")}</time>
            </div>
            <dl className="customer-meta">
              <div>
                <dt>رقم العملية</dt>
                <dd>{log.id}</dd>
              </div>
              <div>
                <dt>المستخدم</dt>
                <dd>{log.actor_id ? `مستخدم رقم ${log.actor_id}` : "النظام"}</dd>
              </div>
              <div>
                <dt>الصفحة</dt>
                <dd>{auditEntityLabel(log.entity_type)}</dd>
              </div>
            </dl>
          </article>
        ))}
        {filteredLogs.length === 0 ? (
          <p className="empty-customer-state">لا توجد عملية مطابقة للبحث الحالي.</p>
        ) : null}
      </div>
    </section>
  );
}

export default function App() {
  const [tokenState, setTokenState] = useState(getToken());
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState("orders");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [bootError, setBootError] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  const activeResource = useMemo(
    () => resourceConfigs.find((resource) => !["cars", "customers", "orders", "shipments", "suppliers", "tasks", "transactions", "users", "wallets"].includes(resource.key) && resource.key === active),
    [active],
  );

  const loadSummary = useCallback(async () => {
    if (!tokenState) return;
    setSummary(await api<DashboardSummary>("/dashboard/summary"));
  }, [tokenState]);

  useEffect(() => {
    if (!tokenState) return;
    api<User>("/auth/me")
      .then((currentUser) => {
        setUser(currentUser);
        return loadSummary();
      })
      .catch((err) => {
        setBootError(err instanceof Error ? err.message : "تعذر فتح الجلسة");
        setToken(null);
        setTokenState(null);
      });
  }, [loadSummary, tokenState]);

  useEffect(() => {
    document.body.dataset.theme = themeMode;
    window.localStorage.setItem("kultur-theme", themeMode);
  }, [themeMode]);

  if (!tokenState || !user) {
    return (
      <>
        {bootError ? <p className="floating-error">{bootError}</p> : null}
        <LoginScreen onLogin={(nextUser, nextToken) => { setUser(nextUser); setTokenState(nextToken); }} />
      </>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src={brandImage}
            alt="KULTUR EXPORT"
          />
          <div>
            <span>KULTUR</span>
            <strong>برنامج الإدارة</strong>
          </div>
        </div>
        <nav aria-label="التنقل">
          {navItems.map((item) => (
            <button
              className={active === item.key ? "active" : undefined}
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="content-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">{user.role?.name ?? "مستخدم"}</p>
            <h1>{user.full_name}</h1>
          </div>
          <div className="topbar-actions">
            <button
              aria-pressed={themeMode === "dark"}
              className="theme-toggle"
              type="button"
              onClick={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
            >
              {themeMode === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setToken(null);
                setTokenState(null);
                setUser(null);
              }}
            >
              خروج
            </button>
          </div>
        </header>
        {active === "customers" ? <CustomersPage onChanged={loadSummary} /> : null}
        {active === "suppliers" ? <SuppliersPage onChanged={loadSummary} onNavigate={setActive} /> : null}
        {active === "shipments" ? <ShipmentsPage onChanged={loadSummary} onNavigate={setActive} /> : null}
        {active === "cars" ? <CarsPage onChanged={loadSummary} onNavigate={setActive} /> : null}
        {active === "wallets" ? <WalletsPage onChanged={loadSummary} onNavigate={setActive} /> : null}
        {active === "transactions" ? <TransactionsPage onChanged={loadSummary} onNavigate={setActive} /> : null}
        {active === "users" ? <UsersPage onChanged={loadSummary} /> : null}
        {active === "tasks" ? <TasksBoard onChanged={loadSummary} /> : null}
        {active === "orders" ? <OrdersBoard onChanged={loadSummary} /> : null}
        {activeResource ? <ResourcePanel config={activeResource} onChanged={loadSummary} /> : null}
        {active === "imports" ? <ImportPanel onChanged={loadSummary} /> : null}
        {active === "audit" ? <AuditPanel /> : null}
      </section>
    </main>
  );
}
