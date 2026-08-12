// Answers direct V1 feedback: people didn't realize the modules on this
// page were interactive (click, hover, flip, drag) until told explicitly.
export default function DiscoveryTipCard() {
  return (
    <div className="headerCard headerCardTip">
      <p className="eyebrow">À savoir</p>
      <h3>Cette page se découvre</h3>
      <p className="headerTipText">
        Clique, survole, retourne et fais glisser les éléments de cette page pour en apprendre plus.
      </p>
    </div>
  );
}
