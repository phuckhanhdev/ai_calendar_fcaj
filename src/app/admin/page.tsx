"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLayout from "@/components/layouts/AppLayout";
import { toast } from "react-toastify";
import "./admin.css";
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  ShieldAlert, 
  Settings, 
  Search, 
  UserCheck, 
  TrendingUp,
  FileText
} from "lucide-react";

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  joinDate: string;
}

interface TransactionItem {
  id: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: string;
  transferNote: string;
  date: string;
}

interface SystemStats {
  totalUsers: number;
  premiumUsers: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<SystemStats>({ totalUsers: 0, premiumUsers: 0, totalRevenue: 0 });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "transactions">("users");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Payment settings state
  const [bankSettings, setBankSettings] = useState({
    bankId: "",
    accountNo: "",
    accountName: "",
    amount: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load all admin data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await fetch("/api/admin/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
          setTransactions(statsData.transactions);
        }
      }

      // 2. Fetch users
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsers(usersData.users);
        }
      }

      // 3. Fetch bank settings
      const settingsRes = await fetch("/api/admin/payment-settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          const s = settingsData.settings;
          setBankSettings({
            bankId: s.ADMIN_BANK_ID || "",
            accountNo: s.ADMIN_BANK_ACCOUNT || "",
            accountName: s.ADMIN_BANK_NAME || "",
            amount: s.SUBSCRIPTION_PRICE || ""
          });
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Không thể tải thông tin quản trị hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update bank settings
  const handleSaveBankSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankSettings)
      });
      if (res.ok) {
        toast.success("Đã cập nhật cấu hình VietQR thành công!");
      } else {
        toast.error("Không thể lưu cấu hình.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi lưu cấu hình.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Promote / Demote user Role
  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (confirm(`Bạn có chắc chắn muốn chuyển vai trò người dùng này thành '${newRole}' không?`)) {
      try {
        const res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId, role: newRole })
        });
        if (res.ok) {
          toast.success("Thay đổi vai trò thành công!");
          setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi thay đổi vai trò.");
      }
    }
  };

  // Toggle Premium status manually
  const handleTogglePremium = async (targetUserId: string, currentStatus: string) => {
    const newStatus = currentStatus === "premium" ? "free" : "premium";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, subscriptionStatus: newStatus })
      });
      if (res.ok) {
        toast.success(`Đã cập nhật trạng thái gói cước thành công!`);
        setUsers(users.map(u => u.id === targetUserId ? { ...u, subscriptionStatus: newStatus } : u));
        loadAdminData(); // Reload aggregates
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi thay đổi trạng thái gói cước.");
    }
  };

  // Search filtering
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Cổng Admin"
        description="Tổng quan doanh thu hệ thống, cấu hình VietQR và phân quyền người dùng"
      />

      {/* Metrics Banner */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-container indigo">
            <Users size={24} />
          </div>
          <div>
            <p className="admin-stat-label">Tổng người dùng</p>
            <p className="admin-stat-val">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-container orange">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="admin-stat-label">Thành viên Premium</p>
            <p className="admin-stat-val">{stats.premiumUsers}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-container emerald">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="admin-stat-label">Doanh thu tích lũy</p>
            <p className="admin-stat-val">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(stats.totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="admin-grid-layout">
        {/* Left Column: Bank Configuration Settings */}
        <div className="admin-left-col">
          <Card title="Cấu hình nhận thanh toán VietQR" icon={<Settings className="text-indigo-500" />}>
            <form onSubmit={handleSaveBankSettings} className="admin-form">
              <div className="admin-form-group">
                <label className="admin-label">Mã ngân hàng (VietQR)</label>
                <select
                  value={bankSettings.bankId}
                  onChange={(e) => setBankSettings({ ...bankSettings, bankId: e.target.value })}
                  className="admin-select"
                  required
                >
                  <option value="">Chọn ngân hàng...</option>
                  <option value="OCB">OCB - Ngân hàng Phương Đông</option>
                  <option value="VCB">VCB - Vietcombank</option>
                  <option value="TCB">TCB - Techcombank</option>
                  <option value="MB">MB - Ngân hàng Quân đội</option>
                  <option value="ICB">CTG - VietinBank</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Số tài khoản</label>
                <input
                  type="text"
                  value={bankSettings.accountNo}
                  onChange={(e) => setBankSettings({ ...bankSettings, accountNo: e.target.value })}
                  placeholder="Nhập số tài khoản..."
                  className="admin-input"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Tên chủ tài khoản (Viết hoa không dấu)</label>
                <input
                  type="text"
                  value={bankSettings.accountName}
                  onChange={(e) => setBankSettings({ ...bankSettings, accountName: e.target.value })}
                  placeholder="NGUYEN PHUC KHANH..."
                  className="admin-input uppercase"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Giá gói cước Premium (VND)</label>
                <input
                  type="number"
                  value={bankSettings.amount}
                  onChange={(e) => setBankSettings({ ...bankSettings, amount: e.target.value })}
                  placeholder="99000"
                  className="admin-input"
                  required
                />
              </div>

              <Button
                type="submit"
                loading={savingSettings}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold mt-2"
              >
                <Settings size={14} />
                Lưu cấu hình nhận tiền
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: User list & transaction logs */}
        <div className="admin-right-col">
          <div className="admin-card-inner">
            {/* Custom Tab headers */}
            <div className="admin-tab-header">
              <div className="admin-tabs">
                <button
                  onClick={() => setActiveTab("users")}
                  className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
                >
                  Người dùng ({users.length})
                </button>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className={`admin-tab-btn ${activeTab === "transactions" ? "active" : ""}`}
                >
                  Lịch sử thanh toán ({transactions.length})
                </button>
              </div>

              {activeTab === "users" && (
                <div className="admin-search-wrapper">
                  <Search size={14} className="text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm email, tên..."
                    className="admin-search-input"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="admin-table-loading">
                <div className="admin-table-loading-spinner animate-spin"></div>
                <p className="admin-table-loading-text">Đang nạp dữ liệu quản trị...</p>
              </div>
            ) : activeTab === "users" ? (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr className="admin-table-header-row">
                      <th className="py-3">Họ tên</th>
                      <th className="py-3">Email</th>
                      <th className="py-3">Quyền</th>
                      <th className="py-3">Gói cước</th>
                      <th className="py-3">Ngày tham gia</th>
                      <th className="py-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="admin-table-row">
                        <td className="admin-table-cell bold">{u.firstName} {u.lastName}</td>
                        <td className="admin-table-cell">{u.email}</td>
                        <td className="admin-table-cell">
                          <span className={`admin-badge ${u.role === "admin" ? "red" : "slate"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="admin-table-cell">
                          <span className={`admin-badge ${u.subscriptionStatus === "premium" ? "indigo" : "slate"}`}>
                            {u.subscriptionStatus}
                          </span>
                        </td>
                        <td className="admin-table-cell text-slate-400 font-semibold">{u.joinDate}</td>
                        <td className="admin-table-cell text-right space-x-1.5">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="admin-btn-action"
                            title="Đổi quyền Admin/User"
                          >
                            Quyền
                          </button>
                          <button
                            onClick={() => handleTogglePremium(u.id, u.subscriptionStatus)}
                            className={`admin-btn-action ${
                              u.subscriptionStatus === "premium" ? "danger" : "primary"
                            }`}
                          >
                            {u.subscriptionStatus === "premium" ? "Hủy Premium" : "Set Premium"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr className="admin-table-header-row">
                      <th className="py-3">Khách hàng</th>
                      <th className="py-3">Mức tiền</th>
                      <th className="py-3">Ghi chú chuyển khoản (Note)</th>
                      <th className="py-3">Thời gian</th>
                      <th className="py-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.map((t) => (
                        <tr key={t.id} className="admin-table-row">
                          <td className="admin-table-cell">
                            <p className="font-bold text-slate-800 m-0">{t.userName}</p>
                            <p className="text-[10px] text-slate-400 m-0">{t.userEmail}</p>
                          </td>
                          <td className="admin-table-cell bold">
                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(t.amount)}
                          </td>
                          <td className="admin-table-cell">
                            <span className="admin-transfer-note">
                              {t.transferNote || "Không có ghi chú"}
                            </span>
                          </td>
                          <td className="admin-table-cell text-slate-400 font-semibold">
                            {new Date(t.date).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="admin-table-cell text-right">
                            <span className="admin-badge emerald">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-semiboldCell">
                          Chưa ghi nhận bất kỳ giao dịch thanh toán nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
