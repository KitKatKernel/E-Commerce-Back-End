const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get one product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });

    if (!product) {
      res.status(404).json({ message: 'No product found with this id!' });
      return;
    }

    res.json(product);
  } catch (err) {
    res.status(500).json(err);
  }
});

// create new product
router.post('/', async (req, res) => {
  try {
    const { product_name, price, stock, category_id, tagIds } = req.body;
    
    // Create the product
    const newProduct = await Product.create({
      product_name,
      price,
      stock,
      category_id
    });

    // If there are tag IDs, create the associations
    if (tagIds && tagIds.length) {
      const productTagIdArr = tagIds.map((tag_id) => {
        return {
          product_id: newProduct.id,
          tag_id,
        };
      });
      await ProductTag.bulkCreate(productTagIdArr);
    }

    res.status(200).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to create product', error: err.message });
  }
});

// update product
router.put('/:id', async (req, res) => {
  try {
    // Update product data excluding tagIds
    const { tagIds, ...productData } = req.body;
    await Product.update(productData, {
      where: {
        id: req.params.id,
      },
    });

    // If there are tag IDs, update the associations
    if (tagIds) {
      const productTags = await ProductTag.findAll({ where: { product_id: req.params.id } });
      const productTagIds = productTags.map(({ tag_id }) => tag_id);

      // Create filtered list of new tag_ids
      const newProductTags = tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });

      // Figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !tagIds.includes(tag_id))
        .map(({ id }) => id);

      // Run both actions
      await Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    }

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(400).json(err);
  }
});

// delete one product by its `id` value
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.destroy({
      where: {
        id: req.params.id,
      },
    });

    if (!product) {
      res.status(404).json({ message: 'No product found with this id!' });
      return;
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
