import { useParams, Navigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';
import { conceptItems, conceptCategories } from '../data/concepts';

const ConceptsCategoryPage = () => {
  const { subcategory } = useParams();
  const catInfo = conceptCategories.find((c) => c.id === subcategory);

  if (!catInfo || !conceptItems[subcategory]) {
    return <Navigate to="/concepts" replace />;
  }

  return (
    <CategoryPage
      category={`concepts-${subcategory}`}
      backTo="/concepts"
      catInfo={catInfo}
    />
  );
};

export default ConceptsCategoryPage;
