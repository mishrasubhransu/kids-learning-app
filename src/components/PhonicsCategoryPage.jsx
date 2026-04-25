import { useParams, Navigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';
import { phonicsFamilies, phonicsWords } from '../data/phonics';

const PhonicsCategoryPage = () => {
  const { family } = useParams();
  const familyInfo = phonicsFamilies.find((f) => f.id === family);

  if (!familyInfo || !phonicsWords[family]) {
    return <Navigate to="/phonics" replace />;
  }

  return (
    <CategoryPage
      category={`phonics-${family}`}
      backTo="/phonics"
    />
  );
};

export default PhonicsCategoryPage;
