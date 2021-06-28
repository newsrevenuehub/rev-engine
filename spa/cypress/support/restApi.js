import orderBy from 'lodash.orderby';
import chunk from 'lodash.chunk';

export class ApiResourceList {
  constructor(rawResults, defaultSortBys, sortableColumns, defaultPageSize = 10) {
    this.rawResults = rawResults;
    this.count = rawResults.length;
    this.defaultPageSize = defaultPageSize;
    this.defaultSortBys = defaultSortBys;
    this.sortableColumns = sortableColumns;
  }

  getNumPagesForPageSize(pageSize) {
    return Math.ceil(this.count / pageSize);
  }

  getOrderedResults(orderByString) {
    let columns = [];
    let directions = [];
    orderByString
      .split(',')
      .filter((item) => this.sortableColumns.includes(item.replace('-', '')))
      .forEach((item) => {
        columns.push(item.replace('-', ''));
        directions.push(item.startsWith('-') ? 'desc' : 'asc');
      });
    if (columns.length === 0) {
      columns = this.defaultSortBys.columns;
      directions = this.defaultSortBys.directions;
    }
    return orderBy(this.rawResults, columns, directions);
  }

  getResponse(pageSize, pageNum, orderByString) {
    if (pageNum > this.getNumPagesForPageSize(pageSize, pageNum)) {
      // this is what Django Rest Framework will return in this case
      return {
        statusCode: 404,
        body: {
          detail: 'Invalid page'
        }
      };
    }
    const orderedResults = this.getOrderedResults(orderByString);
    return {
      statusCode: 200,
      body: {
        count: this.count,
        page_size: parseInt(pageSize),
        page: parseInt(pageNum),
        results: chunk(orderedResults, pageSize)[parseInt(pageNum) - 1]
      }
    };
  }
}
