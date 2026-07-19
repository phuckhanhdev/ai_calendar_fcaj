"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import AppLayout from "@/components/layouts/AppLayout";
import { formatUserName } from "@/lib/name-utils";
import { Compass, Sparkles, Star, Sun } from "lucide-react";
import { calculateDestinyMatrix, getDestinyMatrixDescription } from "@/utils/matrixDestiny";
import "./destiny.css";

export default function DestinyPage() {
  const { user } = useAuth();
  const dobStr = user?.Date_of_birth?.substring(0, 10) || "";

  // Calculate real values based on user's birth details
  const { points, zodiac, emoji } = calculateDestinyMatrix(dobStr);
  const matrixDesc = getDestinyMatrixDescription(points.epoint);

  return (
    <AppLayout>
      <PageHeader
        title="Bản mệnh học"
        description="Khám phá bản đồ ma trận định mệnh, số chủ đạo thần số học và cung hoàng đạo cá nhân"
      />

      <div className="destiny-grid-layout">
        {/* Left Column: Birth profile and Zodiac details */}
        <div className="destiny-left-col">
          {/* Birth Profile Card */}
          <Card title="Hồ sơ ngày sinh" icon={<Sun className="text-orange-500" />}>
            <div className="space-y-4">
              <div className="destiny-profile-row">
                <span className="destiny-profile-label">Họ và tên</span>
                <span className="destiny-profile-value">{formatUserName(user)}</span>
              </div>
              <div className="destiny-profile-row">
                <span className="destiny-profile-label">Ngày sinh</span>
                <span className="destiny-profile-value">
                  {dobStr ? new Date(dobStr).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                </span>
              </div>
              <div className="destiny-profile-row no-border">
                <span className="destiny-profile-label">Giờ sinh</span>
                <span className="destiny-profile-value">
                  {user?.Birth_Time || "12:00 (Mặc định)"}
                </span>
              </div>
            </div>
          </Card>

          {/* Zodiac Details Card */}
          <Card title="Cung hoàng đạo" icon={<Star className="text-amber-500" />}>
            {dobStr ? (
              <div className="destiny-zodiac-box">
                <span className="destiny-zodiac-emoji">{emoji}</span>
                <h4 className="destiny-zodiac-title">{zodiac}</h4>
              </div>
            ) : (
              <div className="destiny-zodiac-notice">
                <p className="destiny-zodiac-notice-text">
                  💡 Hãy cập nhật Ngày sinh trong hồ sơ cá nhân để khám phá Cung hoàng đạo của bạn!
                </p>
              </div>
            )}
            <p className="destiny-zodiac-desc">
              Cung hoàng đạo của bạn phản ánh phần nào xu hướng tính cách bản năng và năng lượng tự nhiên. Hãy kết hợp lời khuyên từ cung hoàng đạo cùng Lịch trình cá nhân để đưa ra quyết định hành động sáng suốt nhất.
            </p>
          </Card>
        </div>

        {/* Right Column: Destiny Matrix Chart */}
        <div className="destiny-right-col">
          <Card
            title="Ma trận Định mệnh (Destiny Matrix)"
            subtitle="Sơ đồ năng lượng luân xa bản mệnh dựa trên ngày sinh"
            icon={<Compass className="text-indigo-500" />}
          >
            <div className="destiny-matrix-wrapper">
              {dobStr ? (
                <>
                  {/* Graphical matrix representation using styled nodes */}
                  <div className="destiny-octagram">
                    {/* Center node */}
                    <div className="destiny-center-node">
                      <span className="destiny-center-val">{points.epoint}</span>
                      <span className="destiny-center-label">Tâm</span>
                    </div>
                    
                    {/* Outer octagram points */}
                    {/* Top B */}
                    <div className="destiny-outer-node red">
                      {points.bpoint}
                    </div>
                    {/* Bottom D */}
                    <div className="destiny-outer-node orange">
                      {points.dpoint}
                    </div>
                    {/* Left A */}
                    <div className="destiny-outer-node emerald">
                      {points.apoint}
                    </div>
                    {/* Right C */}
                    <div className="destiny-outer-node purple">
                      {points.cpoint}
                    </div>
                    
                    {/* Diagonals */}
                    {/* Top-Left F */}
                    <div className="destiny-diagonal-node top-left">
                      {points.fpoint}
                    </div>
                    {/* Top-Right G */}
                    <div className="destiny-diagonal-node top-right">
                      {points.gpoint}
                    </div>
                    {/* Bottom-Left H */}
                    <div className="destiny-diagonal-node bottom-left">
                      {points.hpoint}
                    </div>
                    {/* Bottom-Right I */}
                    <div className="destiny-diagonal-node bottom-right">
                      {points.ipoint}
                    </div>

                    {/* SVG connection lines in background */}
                    <svg className="destiny-connections" viewBox="0 0 256 256">
                      <line x1="128" y1="20" x2="128" y2="236" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                      <line x1="20" y1="128" x2="236" y2="128" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                      <line x1="48" y1="48" x2="208" y2="208" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                      <line x1="208" y1="48" x2="48" y2="208" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                    </svg>
                  </div>

                  <div className="destiny-interpretation">
                    <h5 className="destiny-interpretation-title">
                      <Sparkles size={14} className="text-indigo-500" />
                      {matrixDesc.title}
                    </h5>
                    <p className="destiny-interpretation-desc">
                      {matrixDesc.desc}
                    </p>
                  </div>
                </>
              ) : (
                <div className="destiny-matrix-notice">
                  <p className="destiny-matrix-notice-title">💡 Khám phá Ma trận định mệnh</p>
                  <p className="destiny-matrix-notice-text">
                    Vui lòng cập nhật Ngày sinh trong hồ sơ cá nhân để hệ thống tính toán sơ đồ luân xa và giải nghĩa năng lượng bản mệnh của bạn.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
