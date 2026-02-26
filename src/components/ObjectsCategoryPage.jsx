import { useParams, Navigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';
import { objectItems, objectCategories } from '../data/objects';

const ObjectsCategoryPage = () => {
  const { subcategory } = useParams();
  const catInfo = objectCategories.find((c) => c.id === subcategory);

  if (!catInfo || !objectItems[subcategory]) {
    return <Navigate to="/objects" replace />;
  }

  return (
    <CategoryPage
      category={`objects-${subcategory}`}
      backTo="/objects"
    />
  );
};

export default ObjectsCategoryPage;
