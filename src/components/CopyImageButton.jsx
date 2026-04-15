import * as htmlToImage from "html-to-image";
import { Copy } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

function getActiveFilters(filters) {
  if (!filters) return null;
  const active = [];
  Object.entries(filters).forEach(([key, val]) => {
    if (val && val.length > 0) {
      active.push(`${key}: ${val.join(", ")}`);
    }
  });
  if (active.length === 0) return null;
  return active.join(", ");
}

function getTimestamp() {
  const now = new Date();
  const date =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");
  const time =
    String(now.getHours()).padStart(2, "0") +
    "-" +
    String(now.getMinutes()).padStart(2, "0");
  return `${date}_${time}`;
}

function formatRankType(type) {
  if (!type) return "";

  // khusus yang harus tetap uppercase
  const keepUpper = ["DSF", "TL", "MC"];

  if (keepUpper.includes(type)) return type;

  return type.charAt(0) + type.slice(1).toLowerCase();
}


export default function CopyImageButton({
  targetRef,
  dataDates = {},
  filters = null,
  rankType = null,
  sortBy = null,
  reportType = null,
  reportName = null
}) {
  async function exportImage() {
    if (!targetRef?.current) {
      toast.error("Table not ready");
      return;
    }

    const element = targetRef.current;
    const im3Date = dataDates?.DATA_FWA_IM3 || "N/A";
    const threeDate = dataDates?.DATA_FWA_3ID || "N/A";
    const activeFilters = getActiveFilters(filters);

    const sortMap = {
  achievement: "Achievement",
  revenue: "Revenue",
  fwa: "FWA",
  rebuy: "Rebuy FWA",
  hajj: "Rebuy Haji",
};

const sortLabel = sortBy ? sortMap[sortBy] || sortBy : "";

    const wrapper = document.createElement("div");
    wrapper.style.background = "#ffffff";
    wrapper.style.padding = "24px";
    wrapper.style.fontFamily = "Inter, sans-serif";
    wrapper.style.color = "#111827";
    wrapper.style.display = "inline-block";
    wrapper.style.minWidth = "600px";
    wrapper.style.overflow = "hidden"; // ✅ FIX agar ikut rounded
    wrapper.style.borderRadius = "16px"; // ✅ global rounded
    wrapper.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";

    // Header
    const header = document.createElement("div");
    header.style.marginBottom = "16px";
    header.style.padding = "16px 24px";
    header.style.background = "#f9fafb";
    header.style.borderTopLeftRadius = "16px"; // ✅ hanya atas
    header.style.borderTopRightRadius = "16px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "flex-start";
    header.style.gap = "16px";
    header.style.flexWrap = "wrap";

    // Left
    const leftCol = document.createElement("div");
    leftCol.style.display = "flex";
    leftCol.style.flexDirection = "column";
    leftCol.style.gap = "4px";
    leftCol.style.flex = "1 1 250px";

 // ===== DYNAMIC TITLE =====
const brandFilter = filters?.BRAND || [];

let brandLabel = "";
if (brandFilter.length === 1) {
  if (brandFilter[0].toLowerCase() === "im3") brandLabel = "IM3";
  else if (brandFilter[0].toLowerCase() === "3id") brandLabel = "3ID";
}

let dynamicTitle = `Leaderboard ${formatRankType(rankType) || ""} - ${sortLabel}`.trim();

if (brandLabel) {
  dynamicTitle += ` ${brandLabel}`;
}

const title = document.createElement("div");
title.innerText = dynamicTitle;
    title.style.fontSize = "22px";
    title.style.fontWeight = "700";

    const dateInfo = document.createElement("div");
    dateInfo.innerText = `Data IM3: ${im3Date} | Data 3ID: ${threeDate}`;
    dateInfo.style.fontSize = "13px";
    dateInfo.style.fontStyle = "italic";
    dateInfo.style.color = "#6b7280";

    leftCol.appendChild(title);
    leftCol.appendChild(dateInfo);

    // Right
    const rightCol = document.createElement("div");
    rightCol.style.display = "flex";
    rightCol.style.flexWrap = "wrap";
    rightCol.style.gap = "8px";
    rightCol.style.flex = "1 1 300px";
    rightCol.style.justifyContent = "flex-end";
    rightCol.style.alignItems = "flex-start";
    rightCol.style.wordBreak = "break-word"; // ✅ FIX overflow text

    const createBadge = (text, bg, color) => {
      const badge = document.createElement("span");
      badge.innerText = text;
      badge.style.background = bg;
      badge.style.color = color;
      badge.style.padding = "4px 10px";
      badge.style.borderRadius = "999px";
      badge.style.fontWeight = "500";
      badge.style.fontSize = "12px";
      badge.style.maxWidth = "100%"; // ✅ supaya tidak keluar
      badge.style.wordBreak = "break-word";
      return badge;
    };

    if (rankType)
      rightCol.appendChild(createBadge(`Leaderboard: ${rankType}`, "#e0f2fe", "#0369a1"));
    if (sortLabel)
      rightCol.appendChild(createBadge(`Sort: ${sortLabel}`, "#ede9fe", "#7c3aed"));
    if (activeFilters)
      rightCol.appendChild(createBadge(`Filters: ${activeFilters}`, "#fef3c7", "#b45309"));

    header.appendChild(leftCol);
    header.appendChild(rightCol);
    wrapper.appendChild(header);

    // Table
    const clone = element.cloneNode(true);
    clone.style.width = "max-content";
    clone.style.minWidth = "100%";
    clone.style.display = "block";

    wrapper.appendChild(clone);

    // Footer
    const footer = document.createElement("div");
    footer.style.marginTop = "20px";
    footer.style.fontSize = "11px";
    footer.style.color = "#9ca3af";
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";

    const source = document.createElement("div");
    source.innerText = "Source: https://spmdsf.vercel.app/";

    const timestamp = document.createElement("div");
    timestamp.innerText = `Generated: ${new Date().toLocaleString()}`;

    footer.appendChild(source);
    footer.appendChild(timestamp);
    wrapper.appendChild(footer);

    document.body.appendChild(wrapper);

    await new Promise((r) => setTimeout(r, 100));

    try {
      const dataUrl = await htmlToImage.toPng(wrapper, {
        cacheBust: true,
        pixelRatio: Math.min(3, window.devicePixelRatio * 2),
        backgroundColor: "#ffffff",
      });

      const blob = await (await fetch(dataUrl)).blob();

      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Report copied as image", { icon: "📋" });
      } catch {
        const link = document.createElement("a");
        link.download = `dsf-report-${getTimestamp()}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Image downloaded", { icon: "⬇️" });
      }

      document.body.removeChild(wrapper);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export image");
    }
  }

  return (
    <motion.button
      onClick={exportImage}
      className="
        flex items-center gap-2
        px-3 py-2
        text-sm font-medium
        border border-gray-200
        bg-white
        text-gray-700
        rounded-lg
        shadow-sm
        hover:bg-gray-50
        transition
      "
      whileTap={{ scale: 0.95 }}
    >
      <Copy size={16} />
      Export Image
    </motion.button>
  );
}