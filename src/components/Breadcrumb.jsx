export default function Breadcrumb({
  selectedTL,
  selectedDSF,
  onBackRanking,
  onBackTL,
}) {
  const tlId = selectedTL?.tlId|| "";
  const dsfId = selectedDSF?.idDsf || "";

  return (
    <div className="breadcrumb-wrap">
      <div className="breadcrumb">
        <span
          className="crumb link"
          onClick={onBackRanking}
        >
          Ranking
        </span>

        {selectedTL && tlId && (
          <>
            <span className="crumb-sep">›</span>
            <span
              className={`crumb ${
                selectedDSF ? "link" : "active"
              }`}
              onClick={selectedDSF ? onBackTL : undefined}
            >
              {tlId}
            </span>
          </>
        )}

        {selectedDSF && dsfId && (
          <>
            <span className="crumb-sep">›</span>
            <span className="crumb active">
              {dsfId}
            </span>
          </>
        )}
      </div>
    </div>
  );
}