import React, { useState, useEffect, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { 
  Wrench, 
  Car, 
  Bike,
  Calendar, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit2, 
  Moon, 
  Sun,
  History,
  Cloud,
  RefreshCw,
  X,
  ListPlus,
  BookOpen,
  LayoutGrid,
  ChevronRight,
  LogOut,
  Lock,
  Mail,
  UserPlus,
  LogIn
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';

// ============================================================================
// Error Boundary
// ============================================================================
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-4 bg-rose-500/20 text-rose-400 rounded-full">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-lg font-bold">เกิดข้อผิดพลาดในการแสดงผล</h1>
          <p className="text-xs text-slate-400 max-w-md font-mono bg-slate-900 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all"
          >
            รีโหลดหน้าเว็บใหม่
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// TypeScript Interfaces
// ============================================================================
interface MaItem {
  id: string;
  presetId?: string;
  name: string;
  intervalKm: number;
  intervalMonths: number;
  lastKm?: number;
  lastDate?: string;
  note?: string;
  hasKmInterval?: boolean;
  hasMonthInterval?: boolean;
  targetKm?: number;
  remainingKm?: number;
  kmPercent?: number;
  remainingDays?: number;
  datePercent?: number;
  targetDateStr?: string;
  status?: string;
}

interface CarInfo {
  brand: string;
  model: string;
  year: string;
}

interface Vehicle {
  id: string;
  vehicleType: string;
  carInfo: CarInfo;
  currentKm: number;
  currentDate: string;
  items: MaItem[];
}

interface ServiceHistoryItem {
  id: string;
  carName: string;
  itemId: string;
  itemName: string;
  servicedKm: number;
  servicedDate: string;
  note: string;
}

// ============================================================================
// Firebase Configuration
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBoySa_c91LAgMwqW0y6_Xl9igtJvae--E",
  authDomain: "deecar-app.firebaseapp.com",
  projectId: "deecar-app",
  storageBucket: "deecar-app.firebasestorage.app",
  messagingSenderId: "44351994088",
  appId: "1:44351994088:web:a51a4608c010e6c5ed315d",
  measurementId: "G-RV2B0BR9N4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const PRESET_MA_GROUPS = {
  car: {
    label: '🚗 รายการ MA & เอกสารมาตรฐานสำหรับรถยนต์',
    items: [
      { presetId: 'car-doc-1', name: '📄 ต่อภาษีรถยนต์ประจำปี', intervalKm: 0, intervalMonths: 12, note: 'ชำระภาษีประจำปี (ป้ายวงกลม / ตรวจสภาพ ตรอ. ถ้าเกิน 7 ปี)' },
      { presetId: 'car-doc-2', name: '🛡️ ต่อ พ.ร.บ. รถยนต์', intervalKm: 0, intervalMonths: 12, note: 'ประกันภัยคุ้มครองผู้ประสบภัยจากรถ (บังคับตามกฎหมาย)' },
      { presetId: 'car-doc-3', name: '📑 ต่อประกันภัยรถยนต์ (ภาคสมัครใจ)', intervalKm: 0, intervalMonths: 12, note: 'ประกันภัยชั้น 1 / 2+ / 3+ / ชั้น 3' },
      { presetId: 'car-1', name: 'น้ำมันเครื่อง + ไส้กรอง', intervalKm: 8000, intervalMonths: 6, note: 'เปลี่ยนน้ำมันเครื่องพร้อมไส้กรอง' },
      { presetId: 'car-2', name: 'น้ำยาฟลัชชิ่งเครื่องยนต์', intervalKm: 30000, intervalMonths: 36, note: 'ล้างทำความสะอาดภายในเครื่องยนต์' },
      { presetId: 'car-3', name: 'น้ำยาล้างหัวฉีด (เติมถัง)', intervalKm: 5000, intervalMonths: 0, note: 'ผสมในถังน้ำมันเชื้อเพลิง' },
      { presetId: 'car-4', name: 'กรองอากาศเครื่องยนต์', intervalKm: 10000, intervalMonths: 12, note: 'เป่าทำความสะอาดหรือเปลี่ยนใหม่' },
      { presetId: 'car-5', name: 'กรองแอร์ (Cabin Air Filter)', intervalKm: 6000, intervalMonths: 6, note: 'เพื่อกรองฝุ่นในห้องโดยสาร' },
      { presetId: 'car-6', name: 'สลับยาง หน้า-หลัง', intervalKm: 10000, intervalMonths: 0, note: 'สลับยางเพื่อการสึกหรอที่สม่ำเสมอ' },
      { presetId: 'car-7', name: 'น้ำยาหล่อเย็นหม้อน้ำ (Coolant)', intervalKm: 40000, intervalMonths: 24, note: 'ป้องกันสนิมและคุมความร้อน' },
      { presetId: 'car-8', name: 'น้ำมันเบรก', intervalKm: 40000, intervalMonths: 24, note: 'ไล่ลมเบรกและเปลี่ยนน้ำมันเบรกใหม่' },
      { presetId: 'car-9', name: 'น้ำมันเกียร์', intervalKm: 40000, intervalMonths: 24, note: 'ตรวจเช็คและเปลี่ยนถ่ายตามระยะ' },
      { presetId: 'car-10', name: 'ยางรถยนต์', intervalKm: 40000, intervalMonths: 36, note: 'ตรวจสอบดอกยางและสภาพยาง' },
      { presetId: 'car-11', name: 'ผ้าเบรกหน้า', intervalKm: 45000, intervalMonths: 0, note: 'ตรวจสอบความหนาเนื้อผ้าเบรกหน้า' },
      { presetId: 'car-12', name: 'ผ้าเบรกหลัง', intervalKm: 90000, intervalMonths: 0, note: 'ตรวจสอบความหนาเนื้อผ้าเบรกหลัง/ดรัม' },
      { presetId: 'car-13', name: 'ล้างลิ้นปีกผีเสื้อ & วาล์ว PCV', intervalKm: 20000, intervalMonths: 0, note: 'ล้างคราบเขม่าคราบน้ำมันเกาะ' },
      { presetId: 'car-14', name: 'ล้างแมพเซ็นเซอร์ (MAP Sensor)', intervalKm: 20000, intervalMonths: 0, note: 'ทำความสะอาดเซ็นเซอร์วัดแรงดันอากาศ' },
      { presetId: 'car-15', name: 'สายพานหน้าเครื่อง', intervalKm: 60000, intervalMonths: 48, note: 'ตรวจเช็ครอยแตกร้าวและการหย่อน' },
      { presetId: 'car-16', name: 'ล้างแอร์', intervalKm: 0, intervalMonths: 24, note: 'ล้างทำความสะอาดตู้แอร์และคอยล์' },
      { presetId: 'car-17', name: 'แบตเตอรี่', intervalKm: 0, intervalMonths: 24, note: 'ตรวจเช็คค่าแรงดัน และระดับน้ำกลั่น' },
      { presetId: 'car-18', name: 'ไดชาร์จ (Alternator)', intervalKm: 100000, intervalMonths: 60, note: 'ตรวจสอบระบบกำลังไฟชาร์จ' },
      { presetId: 'car-19', name: 'ปั๊มติ๊ก (Fuel Pump)', intervalKm: 70000, intervalMonths: 0, note: 'ตรวจสอบแรงดันปั๊มส่งน้ำมันเชื้อเพลิง' },
      { presetId: 'car-20', name: 'เพลาขับหน้า R/L', intervalKm: 100000, intervalMonths: 60, note: 'ตรวจสอบยางกันฝุ่นเพลาและหัวเพลา' },
      { presetId: 'car-21', name: 'เปลี่ยนจารบีเพลาขับ', intervalKm: 50000, intervalMonths: 24, note: 'อัดจารบีหัวเพลาใหม่' },
      { presetId: 'car-22', name: 'พ่นกันสนิมใต้ท้องรถ', intervalKm: 0, intervalMonths: 12, note: 'ฉีดพ่นกันสนิมช่วงล่างใต้ท้อง' },
      { presetId: 'car-23', name: 'ใส่จารบีสลักคาลิปเปอร์เบรก', intervalKm: 5000, intervalMonths: 0, note: 'ทาจารบีทนความร้อนสลักดิสเบรก' },
      { presetId: 'car-24', name: 'หัวเทียน (Spark Plugs)', intervalKm: 80000, intervalMonths: 48, note: 'เพื่อการจุดระเบิดที่สมบูรณ์' },
      { presetId: 'car-25', name: 'ยางแท่นเครื่อง', intervalKm: 100000, intervalMonths: 60, note: 'ตรวจสอบรอยทรุด ทรุดตัวหรือแตกร้าว' },
      { presetId: 'car-26', name: 'ยางแท่นเกียร์', intervalKm: 100000, intervalMonths: 60, note: 'ตรวจสอบอาการสั่นและการทรุดตัว' },
      { presetId: 'car-27', name: 'แกนดึงเครื่อง (Engine Torque Rod)', intervalKm: 100000, intervalMonths: 60, note: 'ตรวจสอบยางแท่นยึดดึงเครื่องยนต์' },
      { presetId: 'car-28', name: 'ชุดคลัทช์ (Clutch Set)', intervalKm: 100000, intervalMonths: 60, note: 'จานคลัทช์ หวีคลัทช์ และลูกปืนคลัทช์' },
      { presetId: 'car-29', name: 'ล้างหัวฉีด (Injector Cleaner)', intervalKm: 50000, intervalMonths: 0, note: 'ถอดล้างทำความสะอาดหัวฉีดแบบละเอียด' },
      { presetId: 'car-30', name: 'คอยล์ร้อนแอร์ (Condenser)', intervalKm: 0, intervalMonths: 12, note: 'ไม่มีระยะแน่ชัด ตรวจเช็คความสะอาด/รั่ว' },
      { presetId: 'car-31', name: 'คอยล์เย็นแอร์ (Evaporator)', intervalKm: 0, intervalMonths: 12, note: 'ไม่มีระยะแน่ชัด ตรวจเช็คการรั่วซึม' },
      { presetId: 'car-32', name: 'คอมเพรสเซอร์แอร์', intervalKm: 0, intervalMonths: 12, note: 'ไม่มีระยะแน่ชัด ตรวจเช็คแรงดัน/เสียงดัง' },
      { presetId: 'car-33', name: 'วาล์วฉีดน้ำยาแอร์ (Expansion Valve)', intervalKm: 60000, intervalMonths: 0, note: 'เปลี่ยนเพื่อระบบแรงดันแอร์ที่ฉีดสม่ำเสมอ' },
      { presetId: 'car-34', name: 'ไส้กรองไดเออร์แอร์ (Receiver Drier)', intervalKm: 30000, intervalMonths: 0, note: 'กรองความชื้นในระบบแอร์' },
      { presetId: 'car-35', name: 'ลูกปืนล้อหน้า R+L', intervalKm: 100000, intervalMonths: 0, note: 'ตรวจสอบเสียงหอนหรือตามอาการ' },
      { presetId: 'car-36', name: 'สายคลัทช์', intervalKm: 100000, intervalMonths: 0, note: 'ตรวจสอบระยะระยะฟรีหรือตามอาการ' },
      { presetId: 'car-37', name: 'โช๊คอัพ 4 ต้น', intervalKm: 30000, intervalMonths: 36, note: 'ตรวจสอบการคราบน้ำมันรั่วซึม' }
    ]
  },
  motorcycle: {
    label: '🏍️ รายการ MA & เอกสารมาตรฐานสำหรับมอเตอร์ไซค์',
    items: [
      { presetId: 'moto-doc-1', name: '📄 ต่อภาษีมอเตอร์ไซค์ประจำปี', intervalKm: 0, intervalMonths: 12, note: 'ชำระภาษีประจำปี (ป้ายวงกลม / ตรวจสภาพ ตรอ. ถ้าเกิน 5 ปี)' },
      { presetId: 'moto-doc-2', name: '🛡️ ต่อ พ.ร.บ. มอเตอร์ไซค์', intervalKm: 0, intervalMonths: 12, note: 'ประกันภัยคุ้มครองผู้ประสบภัยจากรถ (บังคับตามกฎหมาย)' },
      { presetId: 'moto-doc-3', name: '📑 ต่อประกันภัยมอเตอร์ไซค์ (ภาคสมัครใจ)', intervalKm: 0, intervalMonths: 12, note: 'ประกันภัยชั้น 2+ / 3+ / ประกันรถหาย' },
      { presetId: 'moto-1', name: 'น้ำมันเครื่อง 10W30 สังเคราะห์', intervalKm: 3000, intervalMonths: 4, note: 'เปลี่ยนถ่ายน้ำมันเครื่องพร้อมแหวนรอง' },
      { presetId: 'moto-2', name: 'น้ำยาล้างหัวฉีด (เติมถัง)', intervalKm: 3000, intervalMonths: 0, note: 'ผสมในถังน้ำมันเชื้อเพลิง' },
      { presetId: 'moto-3', name: 'ฟลัชชิ่งเครื่องยนต์', intervalKm: 20000, intervalMonths: 24, note: 'ล้างทำความสะอาดตกค้างภายในเครื่องยนต์' },
      { presetId: 'moto-4', name: 'น้ำมันเฟืองท้าย (Final Gear Oil)', intervalKm: 6000, intervalMonths: 8, note: 'เปลี่ยนถ่ายตามรอบสำหรับรถออโตเมติก' },
      { presetId: 'moto-5', name: 'หัวเทียน', intervalKm: 8000, intervalMonths: 18, note: 'ตรวจเช็คระยะห่างเขี้ยวและคราบเขม่า' },
      { presetId: 'moto-6', name: 'ล้างชุดข้าง + อัดจารบีชุดชาม', intervalKm: 10000, intervalMonths: 0, note: 'ถอดทำความสะอาดฝุ่นและใส่จารบีทนความร้อน' },
      { presetId: 'moto-7', name: 'ไส้กรองอากาศ', intervalKm: 10000, intervalMonths: 12, note: 'เป่าทำความสะอาดหรือเปลี่ยนไส้กรองใหม่' },
      { presetId: 'moto-8', name: 'ยางมอเตอร์ไซค์ หน้า/หลัง', intervalKm: 15000, intervalMonths: 24, note: 'ตรวจสอบเนื้อยาง สภาพดอกยาง และรอยแตกร้าว' },
      { presetId: 'moto-9', name: 'สายพานขับเคลื่อน (Drive Belt)', intervalKm: 20000, intervalMonths: 0, note: 'ตรวจเช็ครอยแตกร้าวความกว้างสายพาน' },
      { presetId: 'moto-10', name: 'แบตเตอรี่', intervalKm: 0, intervalMonths: 24, note: 'ตรวจเช็คค่าแรงดันไฟ สภาพแบตเตอรี่' },
      { presetId: 'moto-11', name: 'น้ำยาหล่อเย็นหม้อน้ำ', intervalKm: 20000, intervalMonths: 24, note: 'ถ่ายเปลี่ยนน้ำยาหล่อเย็นใหม่' },
      { presetId: 'moto-12', name: 'น้ำมันเบรก', intervalKm: 20000, intervalMonths: 24, note: 'ไล่ลมเบรกและถ่ายเปลี่ยนน้ำมันเบรกใหม่' },
      { presetId: 'moto-13', name: 'ชามใบพัด + ชามเม็ด + แผ่นสไลด์', intervalKm: 20000, intervalMonths: 0, note: 'ตรวจเช็คร่องรอยสึกหรอและรอยร่องเม็ด' },
      { presetId: 'moto-14', name: 'สายพาน + เม็ดน้ำหนัก + ยางสไลด์', intervalKm: 20000, intervalMonths: 0, note: 'ยกชุดเปลี่ยนเมื่อครบระยะหรืองานสึกหรอ' },
      { presetId: 'moto-15', name: 'ผ้าเบรกหน้า', intervalKm: 15000, intervalMonths: 0, note: 'ตรวจสอบร่องความหนาผ้าเบรกหน้า' },
      { presetId: 'moto-16', name: 'ผ้าเบรกหลัง', intervalKm: 15000, intervalMonths: 0, note: 'ตรวจสอบความหนาผ้าเบรกหลัง/ดรัมเบรก' },
      { presetId: 'moto-17', name: 'ลูกปืนคอเตเปอร์', intervalKm: 30000, intervalMonths: 0, note: 'ตรวจสอบอาการคอติด ขรุขระ หรือตามอาการ' }
    ]
  }
};

const evaluateVehicleItems = (vehicle: Vehicle): MaItem[] => {
  if (!vehicle || !vehicle.items) return [];
  const currentDate = vehicle.currentDate || new Date().toISOString().split('T')[0];
  const currentKm = Number(vehicle.currentKm) || 0;
  const now = new Date(currentDate);

  return (vehicle.items || []).map((item: MaItem) => {
    const intervalKm = Number(item.intervalKm) || 0;
    const intervalMonths = Number(item.intervalMonths) || 0;

    const hasKmInterval = intervalKm > 0;
    const hasMonthInterval = intervalMonths > 0;

    let targetKm = 0;
    let remainingKm = 999999;
    let kmPercent = 0;

    if (hasKmInterval) {
      targetKm = (item.lastKm || 0) + intervalKm;
      remainingKm = targetKm - currentKm;
      const kmUsed = Math.max(0, currentKm - (item.lastKm || 0));
      kmPercent = Math.min(100, Math.max(0, (kmUsed / intervalKm) * 100));
    }

    let remainingDays = 999999;
    let datePercent = 0;
    let targetDateStr = 'ไม่มีกำหนดระยะเวลา';

    if (hasMonthInterval) {
      const lastDateObj = new Date(item.lastDate || currentDate);
      const targetDateObj = new Date(lastDateObj);
      targetDateObj.setMonth(targetDateObj.getMonth() + intervalMonths);

      const diffTime = targetDateObj.getTime() - now.getTime();
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const totalDaysInInterval = intervalMonths * 30;
      const daysPassed = totalDaysInInterval - remainingDays;
      datePercent = Math.min(100, Math.max(0, (daysPassed / totalDaysInInterval) * 100));
      targetDateStr = targetDateObj.toISOString().split('T')[0];
    }

    let status = 'normal';
    if ((hasKmInterval && remainingKm <= 0) || (hasMonthInterval && remainingDays <= 0)) {
      status = 'overdue';
    } else if ((hasKmInterval && remainingKm <= 1000) || (hasMonthInterval && remainingDays <= 30)) {
      status = 'soon';
    }

    return {
      ...item,
      hasKmInterval,
      hasMonthInterval,
      targetKm,
      remainingKm,
      kmPercent,
      remainingDays,
      datePercent,
      targetDateStr,
      status
    };
  });
};

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState('garage');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingItem, setEditingItem] = useState<MaItem | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  const [tempKmInput, setTempKmInput] = useState<string>('');

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    vehicleType: 'car',
    brand: '',
    model: '',
    year: '2024',
    currentKm: 0
  });

  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);
  const [managePresetsSelected, setManagePresetsSelected] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setServiceHistory([]);
      setIsCloudLoading(false);
      return;
    }

    setIsCloudLoading(true);
    const docRef = doc(db, 'deecar_users', user.uid);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.vehicles && Array.isArray(data.vehicles)) {
          setVehicles(data.vehicles);
          setSelectedVehicleId(prevId => {
            if (!prevId || !data.vehicles.some((v: Vehicle) => v.id === prevId)) {
              return data.vehicles.length > 0 ? data.vehicles[0].id : '';
            }
            return prevId;
          });
        } else {
          setVehicles([]);
          setSelectedVehicleId('');
        }
        if (data.serviceHistory && Array.isArray(data.serviceHistory)) {
          setServiceHistory(data.serviceHistory);
        }
      } else {
        const initialVehicles: Vehicle[] = [];
        setDoc(docRef, { vehicles: initialVehicles, serviceHistory: [] });
        setVehicles(initialVehicles);
        setSelectedVehicleId('');
      }
      setIsCloudLoading(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      setIsCloudLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveToCloud = async (newVehicles: Vehicle[], newHistory: ServiceHistoryItem[]) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'deecar_users', user.uid);
      await setDoc(docRef, {
        vehicles: newVehicles,
        serviceHistory: newHistory
      });
    } catch (e) {
      console.error("Failed to save to cloud", e);
    }
  };

  const currentVehicle: Vehicle | null = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.find((v: Vehicle) => v.id === selectedVehicleId) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    if (currentVehicle) {
      setTempKmInput(String(currentVehicle.currentKm ?? 0));
    }
  }, [selectedVehicleId, currentVehicle?.currentKm]);

  const vehicleType = currentVehicle?.vehicleType || 'car';
  const carInfo = currentVehicle?.carInfo || { brand: '', model: '', year: '' };
  const currentKm = currentVehicle?.currentKm || 0;
  const currentDate = currentVehicle?.currentDate || new Date().toISOString().split('T')[0];
  const items = currentVehicle?.items || [];

  const updateCurrentVehicle = (updatedFields: Partial<Vehicle>) => {
    if (!currentVehicle) return;
    const updatedVehicles = vehicles.map((v: Vehicle) => {
      if (v.id === currentVehicle.id) {
        return { ...v, ...updatedFields };
      }
      return v;
    });
    setVehicles(updatedVehicles);
    saveToCloud(updatedVehicles, serviceHistory);
  };

  const handleConfirmUpdateKm = () => {
    if (!currentVehicle) return;
    const newKmNum = Math.max(0, Number(tempKmInput) || 0);

    if (newKmNum === currentKm) return;

    const isConfirmed = window.confirm(
      `คุณต้องการบันทึกเลขไมล์ใหม่ของ "${carInfo.brand} ${carInfo.model}" เป็น ${newKmNum.toLocaleString()} กม. ใช่หรือไม่?`
    );

    if (isConfirmed) {
      updateCurrentVehicle({ currentKm: newKmNum });
    } else {
      setTempKmInput(String(currentKm));
    }
  };

  const currentVehicleEvaluatedItems = useMemo(() => {
    if (!currentVehicle) return [];
    return evaluateVehicleItems(currentVehicle);
  }, [currentVehicle]);

  const attentionItems = useMemo(() => {
    return currentVehicleEvaluatedItems.filter((item: MaItem) => item.status === 'overdue' || item.status === 'soon');
  }, [currentVehicleEvaluatedItems]);

  const summary = useMemo(() => {
    const overdueCount = currentVehicleEvaluatedItems.filter((i: MaItem) => i.status === 'overdue').length;
    const soonCount = currentVehicleEvaluatedItems.filter((i: MaItem) => i.status === 'soon').length;
    const normalCount = currentVehicleEvaluatedItems.filter((i: MaItem) => i.status === 'normal').length;
    return { overdueCount, soonCount, normalCount, total: currentVehicleEvaluatedItems.length };
  }, [currentVehicleEvaluatedItems]);

  const allVehiclesSummary = useMemo(() => {
    return vehicles.map(v => {
      const evalItems = evaluateVehicleItems(v);
      const overdueList = evalItems.filter((i: MaItem) => i.status === 'overdue');
      const soonList = evalItems.filter((i: MaItem) => i.status === 'soon');
      return {
        ...v,
        evalItems,
        overdueList,
        soonList,
        overdueCount: overdueList.length,
        soonCount: soonList.length,
        totalAttention: overdueList.length + soonList.length
      };
    });
  }, [vehicles]);

  const handleConfirmAddVehicle = () => {
    if (!newVehicleForm.brand.trim()) {
      alert('กรุณากรอกยี่ห้อรถ/มอเตอร์ไซค์');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const sourceGroupItems = newVehicleForm.vehicleType === 'motorcycle' 
      ? PRESET_MA_GROUPS.motorcycle.items 
      : PRESET_MA_GROUPS.car.items;

    const newVehicleId = 'vehicle-' + Date.now();

    const allPresetItems: MaItem[] = sourceGroupItems.map(preset => ({
      ...preset,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      lastKm: Number(newVehicleForm.currentKm) || 0,
      lastDate: today
    }));

    const newVehicle: Vehicle = {
      id: newVehicleId,
      vehicleType: newVehicleForm.vehicleType,
      carInfo: {
        brand: newVehicleForm.brand,
        model: newVehicleForm.model,
        year: newVehicleForm.year
      },
      currentKm: Number(newVehicleForm.currentKm) || 0,
      currentDate: today,
      items: allPresetItems
    };

    const updated = [...vehicles, newVehicle];
    setVehicles(updated);
    setSelectedVehicleId(newVehicleId);
    saveToCloud(updated, serviceHistory);

    setIsAddVehicleOpen(false);
    setNewVehicleForm({
      vehicleType: 'car',
      brand: '',
      model: '',
      year: '2024',
      currentKm: 0
    });
  };

  const handleOpenManagePresets = () => {
    const existingPresetIds = (items || []).map((i: MaItem) => i.presetId).filter(Boolean) as string[];
    setManagePresetsSelected(existingPresetIds);
    setIsManagePresetsOpen(true);
  };

  const handleSaveManagePresets = () => {
    const today = new Date().toISOString().split('T')[0];
    const sourceGroupItems = vehicleType === 'motorcycle' ? PRESET_MA_GROUPS.motorcycle.items : PRESET_MA_GROUPS.car.items;

    const customItems = items.filter((i: MaItem) => !i.presetId);

    const selectedPresetItems: MaItem[] = managePresetsSelected.map(pId => {
      const existing = items.find((i: MaItem) => i.presetId === pId);
      if (existing) {
        return existing;
      }
      const presetObj = sourceGroupItems.find(p => p.presetId === pId);
      return {
        ...presetObj!,
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        lastKm: currentKm,
        lastDate: today
      };
    }).filter(Boolean);

    const newVehicleItems = [...customItems, ...selectedPresetItems];

    updateCurrentVehicle({ items: newVehicleItems });
    setIsManagePresetsOpen(false);
  };

  const handleDeleteVehicle = () => {
    if (!currentVehicle) return;
    if (window.confirm(`คุณต้องการลบรถ "${carInfo.brand} ${carInfo.model}" ออกจากระบบใช่หรือไม่?`)) {
      const remaining = vehicles.filter((v: Vehicle) => v.id !== currentVehicle.id);
      setVehicles(remaining);
      setSelectedVehicleId(remaining.length > 0 ? remaining[0].id : '');
      saveToCloud(remaining, serviceHistory);
    }
  };

  const handleResetItem = (id: string) => {
    const item = items.find((i: MaItem) => i.id === id);
    if (!item || !currentVehicle) return;

    const isConfirmed = window.confirm(
      `คุณต้องการบันทึกการเปลี่ยน/บริการ/ต่ออายุ "${item.name}" สำหรับ ${carInfo.brand} ${carInfo.model} เป็นวันที่และเลขไมล์ปัจจุบันใช่หรือไม่?`
    );

    if (!isConfirmed) return;

    const newItems = items.map((i: MaItem) => {
      if (i.id === id) {
        return {
          ...i,
          lastKm: currentKm,
          lastDate: currentDate
        };
      }
      return i;
    });

    const updatedVehicles = vehicles.map((v: Vehicle) => {
      if (v.id === currentVehicle.id) {
        return { ...v, items: newItems };
      }
      return v;
    });

    const historyEntry: ServiceHistoryItem = {
      id: Date.now().toString(),
      carName: `${carInfo.brand} ${carInfo.model}`,
      itemId: id,
      itemName: item.name,
      servicedKm: currentKm,
      servicedDate: currentDate,
      note: 'บำรุงรักษา/ต่ออายุเรียบร้อย'
    };

    const updatedHistory = [historyEntry, ...serviceHistory];

    setVehicles(updatedVehicles);
    setServiceHistory(updatedHistory);
    saveToCloud(updatedVehicles, updatedHistory);
  };

  const handleSaveItem = (itemData: MaItem) => {
    let newItems: MaItem[];
    if (itemData.id) {
      newItems = items.map((i: MaItem) => i.id === itemData.id ? itemData : i);
    } else {
      const newItem: MaItem = {
        ...itemData,
        id: 'item-' + Date.now(),
        lastKm: itemData.lastKm !== undefined ? Number(itemData.lastKm) : currentKm,
        lastDate: itemData.lastDate || currentDate
      };
      newItems = [...items, newItem];
    }
    updateCurrentVehicle({ items: newItems });
    setEditingItem(null);
    setIsAddItemOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm("ต้องการลบหัวข้อบำรุงรักษานี้ออกจากรถคันนี้ใช่หรือไม่?")) {
      const newItems = items.filter((i: MaItem) => i.id !== id);
      updateCurrentVehicle({ items: newItems });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('อีเมลนี้ถูกใช้งานแล้ว');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else {
        setAuthError('เกิดข้อผิดพลาด: ' + err.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('โดเมนนี้ยังไม่ได้รับการอนุมัติให้ใช้ Google Sign-In กรุณาเพิ่ม Domain ใน Firebase Console');
      } else {
        setAuthError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ' + err.message);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      signOut(auth);
    }
  };

  const activeGroupPresets = vehicleType === 'motorcycle' ? PRESET_MA_GROUPS.motorcycle : PRESET_MA_GROUPS.car;

  if (authLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-xs font-semibold text-slate-400">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-xl space-y-5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center space-y-1.5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-md mx-auto text-white">
              <Car className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DEECAR Tracker
            </h1>
            <p className="text-[11px] text-slate-400">ระบบเช็กลิสต์ระยะบำรุงรักษาและเอกสารรถยนต์ส่วนบุคคล</p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl shadow-sm border border-slate-300 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-slate-700/50"></div>
              <span className="px-2 text-[10px] text-slate-500 font-semibold">หรือใช้อีเมล</span>
              <div className="flex-1 border-t border-slate-700/50"></div>
            </div>
          </div>

          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'login' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3 h-3" /> เข้าสู่ระบบ
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'register' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3 h-3" /> สมัครสมาชิก
            </button>
          </div>

          {authError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] text-center font-medium leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block text-[11px]">อีเมล (Email)</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block text-[11px]">รหัสผ่าน (Password)</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-all mt-1 text-xs"
            >
              {authMode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1 mx-auto"
            >
              {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />} เปลี่ยนธีมหน้าจอ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-xs transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Header Bar */}
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl shadow-sm text-white">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  DEECAR Tracker
                </h1>
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Cloud className="w-2.5 h-2.5" /> Online
                </span>
              </div>
              <p className="text-[10px] text-slate-400">ระบบเช็กลิสต์ระยะบำรุงรักษาและต่อเอกสารยานพาหนะ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline-block font-mono bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
              {user.email}
            </span>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="เปลี่ยนธีม"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">

        {isCloudLoading ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">กำลังโหลดข้อมูลยานพาหนะของคุณ...</p>
          </div>
        ) : (
          <>
            {/* Top Control Bar */}
            <div className={`p-4 rounded-2xl border shadow-md space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">เลือกยานพาหนะ:</span>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    disabled={vehicles.length === 0}
                    className={`px-2.5 py-1 text-xs rounded-xl border font-bold flex-1 sm:w-64 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-300 text-blue-600'
                    }`}
                  >
                    {vehicles.length === 0 ? (
                      <option value="">-- กรุณาเพิ่มยานพาหนะ --</option>
                    ) : (
                      vehicles.map((v: Vehicle) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicleType === 'motorcycle' ? '🏍️' : '🚘'} {v.carInfo?.brand} {v.carInfo?.model} ({v.carInfo?.year}) - {v.currentKm?.toLocaleString()} กม.
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรถ / มอเตอร์ไซค์ใหม่
                  </button>
                  {vehicles.length > 0 && (
                    <button
                      onClick={handleDeleteVehicle}
                      className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/40 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> ลบคันนี้
                    </button>
                  )}
                </div>
              </div>

              {vehicles.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <Car className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-300">กรุณาเพิ่มยานพาหนะคันแรกของคุณเพื่อเริ่มต้นใช้งาน</p>
                  <p className="text-[10px] text-slate-500">กดปุ่ม "+ เพิ่มรถ / มอเตอร์ไซค์ใหม่" ด้านบนเพื่อเริ่มบันทึกระยะทางและเอกสาร</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  
                  <div className="md:col-span-4 flex items-center gap-3 border-b md:border-b-0 md:border-r pb-3 md:pb-0 border-slate-700/50 pr-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                      {vehicleType === 'motorcycle' ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-medium">
                        ประเภท: {vehicleType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'}
                      </label>
                      <div className="flex gap-1.5 mt-1">
                        <input
                          type="text"
                          value={carInfo.brand}
                          onChange={(e) => updateCurrentVehicle({ carInfo: { ...carInfo, brand: e.target.value } })}
                          className={`w-1/3 px-2 py-1 text-xs rounded-lg border font-semibold ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                          placeholder="ยี่ห้อ"
                        />
                        <input
                          type="text"
                          value={carInfo.model}
                          onChange={(e) => updateCurrentVehicle({ carInfo: { ...carInfo, model: e.target.value } })}
                          className={`w-1/2 px-2 py-1 text-xs rounded-lg border font-semibold ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                          placeholder="รุ่น"
                        />
                        <input
                          type="text"
                          value={carInfo.year}
                          onChange={(e) => updateCurrentVehicle({ carInfo: { ...carInfo, year: e.target.value } })}
                          className={`w-1/4 px-1.5 py-1 text-xs rounded-lg border font-semibold ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                          placeholder="ปี"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-3 border-b md:border-b-0 md:border-r pb-3 md:pb-0 border-slate-700/50 pr-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-medium flex justify-between">
                        <span>เลขไมล์ปัจจุบัน (คลิกออกนอกช่องเพื่อบันทึก)</span>
                        <span className="text-emerald-400 font-mono">Odometer</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          value={tempKmInput}
                          onChange={(e) => setTempKmInput(e.target.value)}
                          onBlur={handleConfirmUpdateKm}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className={`w-full px-2.5 py-1 text-sm font-mono font-bold rounded-lg border ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-600'
                          }`}
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400">กม.</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-medium">วันที่ปัจจุบัน</label>
                      <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => updateCurrentVehicle({ currentDate: e.target.value })}
                        className={`w-full mt-1 px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Dashboard Navigation Tabs */}
            <div className="flex border-b border-slate-700/50 gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('garage')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'garage'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                📊 ภาพรวมรถทุกคัน ({vehicles.length})
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                เช็กลิสต์ MA คันที่เลือก
                {(summary.overdueCount > 0 || summary.soonCount > 0) && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {summary.overdueCount + summary.soonCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('items')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'items'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                จัดการหัวข้อ MA คันนี้ ({items.length})
              </button>

              <button
                onClick={() => setActiveTab('preset-catalog')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'preset-catalog'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                คลัง MA มาตรฐาน
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                ประวัติการบันทึก ({serviceHistory.length})
              </button>
            </div>

            {/* TAB 0: GARAGE ALL VEHICLES SUMMARY */}
            {activeTab === 'garage' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold flex items-center gap-1.5">
                      <LayoutGrid className="w-4 h-4 text-blue-500" /> สรุปสถานะการบำรุงรักษาและเอกสารรถทั้งหมด
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">แสดงภาพรวมของรถทุกคันและรายการเตือนระยะบำรุงรักษา/หมดอายุเอกสารในแต่ละคัน</p>
                  </div>
                  <button
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มคันใหม่
                  </button>
                </div>

                {allVehiclesSummary.length === 0 ? (
                  <div className={`p-10 text-center rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <p className="text-xs font-semibold mb-2">ยังไม่มีรถในระบบของคุณ</p>
                    <button
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-sm mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> กดเพื่อเพิ่มรถคันแรก
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allVehiclesSummary.map((vSummary: any) => {
                      const isSelected = vSummary.id === selectedVehicleId;
                      return (
                        <div 
                          key={vSummary.id} 
                          className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                            isSelected 
                              ? 'border-blue-500 shadow-md shadow-blue-500/10' 
                              : isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-700/50">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-xl ${
                                  vSummary.vehicleType === 'motorcycle' 
                                    ? 'bg-amber-500/10 text-amber-400' 
                                    : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                  {vSummary.vehicleType === 'motorcycle' ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                                </div>
                                <div>
                                  <h3 className="font-bold text-xs flex items-center gap-1.5">
                                    {vSummary.carInfo?.brand} {vSummary.carInfo?.model}
                                    <span className="text-[10px] font-normal text-slate-400">({vSummary.carInfo?.year})</span>
                                  </h3>
                                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                                    เลขไมล์ปัจจุบัน: {vSummary.currentKm?.toLocaleString()} กม.
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedVehicleId(vSummary.id);
                                  setActiveTab('dashboard');
                                }}
                                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all"
                              >
                                จัดการคันนี้ <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="my-3 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className="text-slate-400">รายการที่ต้องดูแล / ต่ออายุ:</span>
                                <div className="flex gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    vSummary.overdueCount > 0 ? 'bg-rose-500/20 text-rose-400 font-bold' : 'bg-slate-800 text-slate-500'
                                  }`}>
                                    เกินระยะ: {vSummary.overdueCount}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    vSummary.soonCount > 0 ? 'bg-amber-500/20 text-amber-400 font-bold' : 'bg-slate-800 text-slate-500'
                                  }`}>
                                    ใกล้ถึง: {vSummary.soonCount}
                                  </span>
                                </div>
                              </div>

                              {vSummary.totalAttention === 0 ? (
                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[11px] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>ทุกรายการและเอกสารปกติสมบูรณ์ดี อยู่ในระยะที่กำหนด</span>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {vSummary.overdueList.map((item: MaItem) => (
                                    <div key={item.id} className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        <span>{item.name}</span>
                                      </div>
                                      <span className="font-mono text-rose-300">
                                        {item.hasKmInterval && item.remainingKm! <= 0 
                                          ? `เกิน ${Math.abs(item.remainingKm!).toLocaleString()} กม.` 
                                          : item.hasMonthInterval && item.remainingDays! <= 0 
                                          ? `เลย ${Math.abs(item.remainingDays!)} วัน`
                                          : 'เลยกำหนด'}
                                      </span>
                                    </div>
                                  ))}

                                  {vSummary.soonList.map((item: MaItem) => (
                                    <div key={item.id} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                        <Clock className="w-3 h-3 shrink-0" />
                                        <span>{item.name}</span>
                                      </div>
                                      <span className="font-mono text-amber-300">
                                        {item.hasKmInterval && item.remainingKm! <= 1000 
                                          ? `เหลือ ${item.remainingKm!.toLocaleString()} กม.` 
                                          : item.hasMonthInterval && item.remainingDays! <= 30 
                                          ? `เหลือ ${item.remainingDays!} วัน`
                                          : 'ใกล้ถึงกำหนด'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500">
                            <span>หัวข้อทั้งหมด: {vSummary.items?.length || 0} รายการ</span>
                            <span>อัปเดต: {vSummary.currentDate}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: DASHBOARD / CHECKLIST VIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-rose-950/30 border-rose-900/50' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-rose-500/20 text-rose-500 rounded-xl">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-rose-400 font-medium">เกินระยะ / หมดอายุ</p>
                        <p className="text-lg font-bold text-rose-500">{summary.overdueCount} รายการ</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-amber-500/20 text-amber-500 rounded-xl">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-400 font-medium">ใกล้ถึงกำหนดต่ออายุ</p>
                        <p className="text-lg font-bold text-amber-500">{summary.soonCount} รายการ</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-500 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-400 font-medium">สภาพปกติ (OK)</p>
                        <p className="text-lg font-bold text-emerald-500">{summary.normalCount} รายการ</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!currentVehicle ? (
                  <div className={`p-8 text-center rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <p className="text-xs font-semibold mb-2">ยังไม่มีรถในระบบ</p>
                    <button
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-sm mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มรถคันแรก
                    </button>
                  </div>
                ) : items.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <p className="text-xs font-semibold mb-2">ยังไม่มีรายการเช็กลิสต์ MA สำหรับ {carInfo.brand} {carInfo.model}</p>
                    <div className="flex justify-center gap-2 mt-2">
                      <button
                        onClick={handleOpenManagePresets}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <ListPlus className="w-3.5 h-3.5" /> เพิ่มหัวข้อเช็กลิสต์ MA & เอกสาร
                      </button>
                    </div>
                  </div>
                ) : attentionItems.length === 0 ? (
                  <div className={`p-10 text-center rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold">ยอดเยี่ยม! รถคันนี้สภาพปกติและเอกสารครบทุกรายการ</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">ยังไม่มีรายการใดที่เกินระยะหรือใกล้หมดอายุในตอนนี้</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attentionItems.map((item: MaItem) => {
                      let statusBadgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      let statusText = 'ปกติ / ยังไม่ถึงระยะ';
                      let progressKmColor = 'bg-emerald-500';

                      if (item.status === 'overdue') {
                        statusBadgeBg = 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
                        statusText = 'เกินกำหนด / หมดอายุ!';
                        progressKmColor = 'bg-rose-500';
                      } else if (item.status === 'soon') {
                        statusBadgeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                        statusText = 'ใกล้ถึงกำหนดต่ออายุ';
                        progressKmColor = 'bg-amber-500';
                      }

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all hover:shadow-lg relative overflow-hidden flex flex-col justify-between ${
                            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5 mb-3">
                            <div>
                              <h3 className="font-bold text-xs flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {item.name}
                              </h3>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.note}</p>
                            </div>

                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${statusBadgeBg}`}>
                              {statusText}
                            </span>
                          </div>

                          <div className="space-y-3 my-1">
                            {item.hasKmInterval ? (
                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Gauge className="w-3 h-3" /> ระยะทาง (KM)
                                  </span>
                                  <span className="font-mono font-bold">
                                    {item.remainingKm! <= 0 ? (
                                      <span className="text-rose-400">เกินไป {Math.abs(item.remainingKm!).toLocaleString()} กม.</span>
                                    ) : (
                                      <span>เหลืออีก {item.remainingKm!.toLocaleString()} กม.</span>
                                    )}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${progressKmColor}`}
                                    style={{ width: `${item.kmPercent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                                  <span>ล่าสุด: {item.lastKm?.toLocaleString()} กม.</span>
                                  <span>ครบกำหนด: {item.targetKm?.toLocaleString()} กม.</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">
                                * ไม่จำกัดระยะทาง (ยึดตามรอบวันหมดอายุ/ต่ออายุประจำปี)
                              </div>
                            )}

                            {item.hasMonthInterval ? (
                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> ระยะเวลา / วันหมดอายุ
                                  </span>
                                  <span className="font-mono font-bold">
                                    {item.remainingDays! <= 0 ? (
                                      <span className="text-rose-400">หมดอายุแล้ว {Math.abs(item.remainingDays!)} วัน</span>
                                    ) : (
                                      <span>เหลืออีก {item.remainingDays!} วัน</span>
                                    )}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-700/40 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      item.remainingDays! <= 0 ? 'bg-rose-500' : item.remainingDays! <= 30 ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${item.datePercent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                                  <span>ต่อล่าสุด: {item.lastDate}</span>
                                  <span>หมดอายุ: {item.targetDateStr}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">
                                * ไม่มีกำหนดระยะเวลา
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-800/60 mt-2 flex items-center justify-end">
                            <button
                              onClick={() => handleResetItem(item.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" /> บันทึกทำแล้ว / ต่ออายุแล้ว (Reset)
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: MANAGE ITEMS */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                  <div>
                    <h2 className="text-sm font-bold">
                      {currentVehicle ? `เช็กลิสต์ MA & เอกสารของ ${carInfo.brand} ${carInfo.model}` : 'จัดการหัวข้อ MA'}
                    </h2>
                    {currentVehicle && (
                      <p className="text-[10px] text-slate-400">
                        ประเภทรถ: <span className="text-blue-400 font-semibold">{vehicleType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'}</span> (เพิ่ม/ลบหัวข้อเช็กลิสต์ได้อิสระ)
                      </p>
                    )}
                  </div>
                  
                  {currentVehicle && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenManagePresets}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <ListPlus className="w-3.5 h-3.5" /> ติ๊กเลือก/ลบ หัวข้อ
                      </button>

                      <button
                        onClick={() => {
                          setEditingItem({
                            id: '',
                            name: '',
                            intervalKm: 10000,
                            intervalMonths: 6,
                            lastKm: currentKm,
                            lastDate: currentDate,
                            note: ''
                          });
                          setIsAddItemOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มหัวข้อ Custom
                      </button>
                    </div>
                  )}
                </div>

                <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] uppercase border-b ${isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        <tr>
                          <th className="p-3">รายการเช็กลิสต์ / เอกสาร</th>
                          <th className="p-3">รอบเปลี่ยน (กม.)</th>
                          <th className="p-3">รอบต่ออายุ (เดือน)</th>
                          <th className="p-3">ทำล่าสุด (กม.)</th>
                          <th className="p-3">ทำล่าสุด (วันที่)</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {!currentVehicle || items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                              {!currentVehicle ? 'กรุณาเพิ่มยานพาหนะก่อนจัดการหัวข้อ MA' : 'ยังไม่มีรายการเช็กลิสต์ กดปุ่มด้านบนเพื่อเพิ่มหัวข้อ'}
                            </td>
                          </tr>
                        ) : (
                          items.map((i: MaItem) => (
                            <tr key={i.id} className="hover:bg-slate-800/20 transition-colors">
                              <td className="p-3 font-semibold">
                                {i.name}
                                <div className="text-[10px] text-slate-400 font-normal">{i.note}</div>
                              </td>
                              <td className="p-3 font-mono">{i.intervalKm > 0 ? `${i.intervalKm?.toLocaleString()} กม.` : '-'}</td>
                              <td className="p-3 font-mono">{i.intervalMonths > 0 ? `${i.intervalMonths} เดือน` : '-'}</td>
                              <td className="p-3 font-mono">{i.lastKm?.toLocaleString()} กม.</td>
                              <td className="p-3 font-mono">{i.lastDate}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingItem(i);
                                      setIsAddItemOpen(true);
                                    }}
                                    className="p-1 hover:bg-slate-700/50 text-blue-400 rounded-lg"
                                    title="แก้ไข"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(i.id)}
                                    className="p-1 hover:bg-rose-900/30 text-rose-400 rounded-lg"
                                    title="ลบออกจากคันนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PRESET CATALOG */}
            {activeTab === 'preset-catalog' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-500" /> คลังหัวข้อเช็กลิสต์ MA & เอกสารมาตรฐานทั้งหมดในระบบ
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    รายการบำรุงรักษาและต่ออายุเอกสารประจำปีสำหรับ รถยนต์ ({PRESET_MA_GROUPS.car.items.length} หัวข้อ) และ มอเตอร์ไซค์ ({PRESET_MA_GROUPS.motorcycle.items.length} หัวข้อ)
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className="font-bold text-xs flex items-center gap-1.5 text-blue-400 border-b pb-2.5 border-slate-700/50">
                      <Car className="w-4 h-4" /> {PRESET_MA_GROUPS.car.label} ({PRESET_MA_GROUPS.car.items.length} รายการ)
                    </h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {PRESET_MA_GROUPS.car.items.map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-0.5 ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-xs">{item.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {item.intervalKm > 0 ? `${item.intervalKm.toLocaleString()} กม.` : 'ไม่ระบุกม.'} 
                              {item.intervalMonths > 0 ? ` / ${item.intervalMonths} เดือน` : ''}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className="font-bold text-xs flex items-center gap-1.5 text-amber-400 border-b pb-2.5 border-slate-700/50">
                      <Bike className="w-4 h-4" /> {PRESET_MA_GROUPS.motorcycle.label} ({PRESET_MA_GROUPS.motorcycle.items.length} รายการ)
                    </h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {PRESET_MA_GROUPS.motorcycle.items.map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-0.5 ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-xs">{item.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {item.intervalKm > 0 ? `${item.intervalKm.toLocaleString()} กม.` : 'ไม่ระบุกม.'} 
                              {item.intervalMonths > 0 ? ` / ${item.intervalMonths} เดือน` : ''}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold">ประวัติการบันทึกการบำรุงรักษา/ต่อเอกสารทั้งหมด</h2>
                    <p className="text-[10px] text-slate-400">ประวัติการกด Reset เช็กลิสต์และต่อเอกสารของรถทุกคันในระบบ</p>
                  </div>

                  {serviceHistory.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm("คุณต้องการล้างประวัติทั้งหมดใช่หรือไม่?")) {
                          setServiceHistory([]);
                          saveToCloud(vehicles, []);
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300"
                    >
                      ล้างประวัติทั้งหมด
                    </button>
                  )}
                </div>

                <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  {serviceHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ยังไม่มีประวัติการกดรีเซ็ตเปลี่ยนถ่ายหรือต่ออายุเอกสาร
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/40">
                      {serviceHistory.map((h: ServiceHistoryItem) => (
                        <div key={h.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-xs">{h.itemName} <span className="text-[10px] text-blue-400 font-normal">({h.carName})</span></p>
                              <p className="text-[10px] text-slate-400">{h.note}</p>
                            </div>
                          </div>

                          <div className="text-right font-mono text-[11px]">
                            <p className="text-emerald-400 font-bold">{h.servicedKm?.toLocaleString()} กม.</p>
                            <p className="text-slate-400 text-[10px]">{h.servicedDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Modal 1: เพิ่มรถ/มอเตอร์ไซค์ใหม่ */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-5 rounded-2xl border shadow-2xl space-y-3.5 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-700/50">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-500" /> เพิ่มยานพาหนะใหม่
              </h3>
              <button onClick={() => setIsAddVehicleOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">ประเภทพาหนะ:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVehicleForm({ ...newVehicleForm, vehicleType: 'car' })}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all text-xs ${
                      newVehicleForm.vehicleType === 'car'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> รถยนต์ (Car)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVehicleForm({ ...newVehicleForm, vehicleType: 'motorcycle' })}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all text-xs ${
                      newVehicleForm.vehicleType === 'motorcycle'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" /> มอเตอร์ไซค์ (Bike)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-slate-400 font-semibold text-[11px]">ยี่ห้อ</label>
                  <input
                    type="text"
                    value={newVehicleForm.brand}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, brand: e.target.value })}
                    className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                    placeholder="Honda / Toyota"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold text-[11px]">รุ่น</label>
                  <input
                    type="text"
                    value={newVehicleForm.model}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                    className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                    placeholder="Click / Vios"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold text-[11px]">ปี (ค.ศ.)</label>
                  <input
                    type="text"
                    value={newVehicleForm.year}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, year: e.target.value })}
                    className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                    placeholder="2025"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold text-[11px]">เลขไมล์เริ่มต้น (กม.)</label>
                  <input
                    type="number"
                    value={newVehicleForm.currentKm}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, currentKm: Number(e.target.value) })}
                    className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border font-mono ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] leading-relaxed">
                ✨ **หมายเหตุ:** ระบบจะดึงหัวข้อ MA และเอกสารทั้งหมดของ{newVehicleForm.vehicleType === 'motorcycle' ? 'มอเตอร์ไซค์ (20 หัวข้อ)' : 'รถยนต์ (40 หัวข้อ)'}ให้อัตโนมัติ
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-800">
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                className="px-3.5 py-1.5 text-[11px] rounded-xl border border-slate-700 hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmAddVehicle}
                className="px-4 py-1.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
              >
                สร้างยานพาหนะนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: ติ๊กเลือก/ลบ หัวข้อ MA เพิ่มเติมภายหลัง */}
      {isManagePresetsOpen && currentVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-5 rounded-2xl border shadow-2xl space-y-3 max-h-[80vh] overflow-y-auto ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-700/50">
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <ListPlus className="w-4 h-4 text-indigo-400" /> เพิ่ม/ลด หัวข้อ MA & เอกสาร
                </h3>
                <p className="text-[10px] text-slate-400">
                  {carInfo.brand} {carInfo.model}
                </p>
              </div>
              <button onClick={() => setIsManagePresetsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {activeGroupPresets.items.map((preset) => {
                const isChecked = managePresetsSelected.includes(preset.presetId);
                return (
                  <label
                    key={preset.presetId}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      isChecked 
                        ? isDarkMode ? 'bg-indigo-950/40 border-indigo-600/60' : 'bg-indigo-50 border-indigo-300'
                        : isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setManagePresetsSelected([...managePresetsSelected, preset.presetId]);
                        } else {
                          setManagePresetsSelected(managePresetsSelected.filter(id => id !== preset.presetId));
                        }
                      }}
                      className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <div>
                      <div className="font-semibold text-[11px]">{preset.name}</div>
                      <div className="text-[9px] text-slate-400">
                        {preset.intervalKm > 0 ? `${preset.intervalKm.toLocaleString()} กม.` : ''} {preset.intervalMonths > 0 ? `${preset.intervalMonths} เดือน` : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-800">
              <button
                onClick={() => setIsManagePresetsOpen(false)}
                className="px-3.5 py-1.5 text-[11px] rounded-xl border border-slate-700 hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveManagePresets}
                className="px-4 py-1.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm"
              >
                บันทึกการปรับเปลี่ยน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add or Edit Custom Item */}
      {isAddItemOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-5 rounded-2xl border shadow-2xl space-y-3 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className="text-sm font-bold">
              {editingItem.id ? 'แก้ไขรายการเช็กลิสต์' : `เพิ่มหัวข้อ Custom ให้ ${carInfo.brand} ${carInfo.model}`}
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 font-semibold text-[11px]">ชื่อรายการเช็กลิสต์</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="เช่น เปลี่ยนยางรถยนต์"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold text-[10px]">รอบเปลี่ยน (กม.) [0 ถ้าไม่มี]</label>
                  <input
                    type="number"
                    value={editingItem.intervalKm}
                    onChange={(e) => setEditingItem({ ...editingItem, intervalKm: Number(e.target.value) })}
                    className={`w-full mt-1 px-2 py-1.5 text-xs rounded-lg border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold text-[10px]">รอบต่ออายุ (เดือน) [0 ถ้าไม่มี]</label>
                  <input
                    type="number"
                    value={editingItem.intervalMonths}
                    onChange={(e) => setEditingItem({ ...editingItem, intervalMonths: Number(e.target.value) })}
                    className={`w-full mt-1 px-2 py-1.5 text-xs rounded-lg border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold text-[10px]">ทำล่าสุด (กม.)</label>
                  <input
                    type="number"
                    value={editingItem.lastKm}
                    onChange={(e) => setEditingItem({ ...editingItem, lastKm: Number(e.target.value) })}
                    className={`w-full mt-1 px-2 py-1.5 text-xs rounded-lg border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold text-[10px]">ทำล่าสุด (วันที่)</label>
                  <input
                    type="date"
                    value={editingItem.lastDate}
                    onChange={(e) => setEditingItem({ ...editingItem, lastDate: e.target.value })}
                    className={`w-full mt-1 px-2 py-1.5 text-xs rounded-lg border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold text-[11px]">หมายเหตุ</label>
                <input
                  type="text"
                  value={editingItem.note || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                  className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsAddItemOpen(false);
                  setEditingItem(null);
                }}
                className="px-3.5 py-1.5 text-[11px] rounded-xl border border-slate-700 hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleSaveItem(editingItem)}
                className="px-4 py-1.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}