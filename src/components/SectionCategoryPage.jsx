import { useParams, Navigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';

// One lesson of a multi-lesson home card (Concepts, Science), picked by the
// URL: /concepts/animals → category 'concepts-animals'. Unknown lessons go
// back to the section's menu.
const SectionCategoryPage = ({ section, categories, items }) => {
  const { subcategory } = useParams();
  const catInfo = categories.find((c) => c.id === subcategory);

  if (!catInfo || !items[subcategory]) {
    return <Navigate to={`/${section}`} replace />;
  }

  return (
    <CategoryPage
      category={`${section}-${subcategory}`}
      backTo={`/${section}`}
      catInfo={catInfo}
    />
  );
};

export default SectionCategoryPage;
