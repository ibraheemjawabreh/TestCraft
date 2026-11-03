import type { PracticalAppDefinition } from './types'
export const registrationDefinition:PracticalAppDefinition={
 key:'registration_form',nameEn:'Registration Form',nameAr:'نموذج التسجيل',
 descriptionEn:'Simulated registration with validation, duplicate detection and consent.',
 descriptionAr:'تسجيل محاكى لفحص التحقق من البيانات والتكرار والموافقة.',
 defaultConfig:{passwordMinLength:8},
 bugPresets:[
 {key:'duplicate_email_allowed',titleEn:'Duplicate email accepted',titleAr:'قبول بريد مكرر',descriptionEn:'An existing simulated email is accepted again.',descriptionAr:'يُقبل بريد محاكى مسجل مسبقًا مرة أخرى.',actual_severity:'High',bonus_xp:30},
 {key:'password_confirmation_ignored',titleEn:'Password confirmation ignored',titleAr:'تجاهل تأكيد كلمة المرور',descriptionEn:'Different password and confirmation values are accepted.',descriptionAr:'تُقبل كلمتا مرور غير متطابقتين.',actual_severity:'Medium',bonus_xp:25},
 {key:'consent_not_required',titleEn:'Consent not enforced',titleAr:'عدم اشتراط الموافقة',descriptionEn:'Registration proceeds without required consent.',descriptionAr:'يكتمل التسجيل دون الموافقة المطلوبة.',actual_severity:'Medium',bonus_xp:25},
 ]}
export const storefrontDefinition:PracticalAppDefinition={
 key:'storefront',nameEn:'Simulated Storefront',nameAr:'متجر محاكى',
 descriptionEn:'Search, categories, stock, cart arithmetic and simulated checkout.',
 descriptionAr:'بحث وفئات ومخزون وحساب سلة وتأكيد طلب محاكى.',
 defaultConfig:{},
 bugPresets:[
 {key:'search_filter_ignored',titleEn:'Search filter ignored',titleAr:'تجاهل مرشح البحث',descriptionEn:'Search does not narrow matching products.',descriptionAr:'لا يضيّق البحث قائمة المنتجات المطابقة.',actual_severity:'Medium',bonus_xp:20},
 {key:'cart_quantity_total_wrong',titleEn:'Cart quantity omitted from total',titleAr:'عدم احتساب الكمية في الإجمالي',descriptionEn:'Line total uses one unit regardless of quantity.',descriptionAr:'يحسب مجموع السطر وحدة واحدة مهما كانت الكمية.',actual_severity:'High',bonus_xp:35},
 {key:'stock_limit_ignored',titleEn:'Stock limit ignored',titleAr:'تجاهل حد المخزون',descriptionEn:'The cart accepts quantities above available stock.',descriptionAr:'تقبل السلة كمية تزيد على المخزون المتاح.',actual_severity:'High',bonus_xp:30},
 ]}

