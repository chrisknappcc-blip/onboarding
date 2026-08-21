import ContentSection from './ContentSection.jsx';

export default function AppWalkthroughs({ trackKey }) {
  return <ContentSection trackKey={trackKey} section="app-walkthroughs" searchable emptyLabel="Walkthroughs for our internal tools are on the way." />;
}
