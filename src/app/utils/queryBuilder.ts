import type { Model, Query } from 'mongoose';

export const buildQuery = <T>(model: Model<T>, queryParams: Record<string, any>) => {
  const builder = {
    // 1. Internal state (The Mongoose Query)
    modelQuery: model.find() as Query<T[], T>,

    // 2. Search: $or with case-insensitive regex
    search(searchableFields: string[]) {
      if (queryParams.searchTerm && searchableFields.length > 0) {
        this.modelQuery = this.modelQuery.find({
          $or: searchableFields.map((field) => ({
            [field]: { $regex: queryParams.searchTerm, $options: 'i' },
          })),
        });
      }
      return this;
    },

    // 3. Filter: Exact matches and operator conversion (gt, lt, etc.)
    filter() {
      const queryObj = { ...queryParams };
      const excludeFields = ['searchTerm', 'sort', 'limit', 'page', 'fields'];

      // Remove non-filter fields
      excludeFields.forEach((el) => delete queryObj[el]);

      // Convert gt, gte, lt, lte to $gt, $gte, etc.
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

      this.modelQuery = this.modelQuery.find(JSON.parse(queryStr));
      return this;
    },

    // 4. Sort: Converts comma-separated string to space-separated
    sort() {
      const sortBy = queryParams.sort?.split(',')?.join(' ') || '-createdAt';
      this.modelQuery = this.modelQuery.sort(sortBy);
      return this;
    },

    // 5. Paginate: Handles skip and limit
    paginate() {
      const page = Number(queryParams.page) || 1;
      const limit = Number(queryParams.limit) || 10;
      const skip = (page - 1) * limit;
      this.modelQuery = this.modelQuery.skip(skip).limit(limit);
      return this;
    },

    // 6. Fields: Select specific columns (Projection)
    fields(fieldsStr?: string) {
      const fields = (fieldsStr || queryParams.fields)?.split(',')?.join(' ') || '-__v';
      this.modelQuery = this.modelQuery.select(fields);
      return this;
    },

    // 6. The "Go" Button
    async execute() {
      const filters = this.modelQuery.getFilter();
      const [data, total] = await Promise.all([
        this.modelQuery.exec(),
        model.countDocuments(filters),
      ]);

      const page = Number(queryParams.page) || 1;
      const limit = Number(queryParams.limit) || 10;

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  };

  return builder;
};


// use case example:

// const getDoctors = async (req, res) => {
//   const result = await buildQuery(Doctor, req.query)
//     .search(['name', 'email', 'contactNumber'])
//     .filter()
//     .sort()
//     .fields('name,email,specialization')
//     .paginate()
//     .execute();

//   res.status(200).json({
//     success: true,
//     message: "Doctors retrieved successfully",
//     meta: result.meta,
//     data: result.data,
//   });
// };