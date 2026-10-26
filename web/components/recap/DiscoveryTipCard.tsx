// Answers direct V1 feedback: people didn't realize the modules on this
// page were interactive (click, hover, flip, drag) until told explicitly.
export default function DiscoveryTipCard() {
  return (
    <div className="headerCard headerCardTip">
      <h3>Curieuses et curieux, oyez, oyez&nbsp;!</h3>
      <p className="headerTipText">
        <span className="verbPointer">Clique et survole</span>
        <span className="verbTouch">Appuie sur</span> les éléments pour en apprendre plus&nbsp;! Les noms des films
        t&apos;emmènent sur leur page Letterboxd.
      </p>
    </div>
  );
}
