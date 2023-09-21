export default {
	init: async () => {
		const shippingDate = dat_shippingDate.formattedDate || new Date().toISOString();
		storeValue('defaultTab', 'Sales Order');
		storeValue('carrier', 	{
			id: 1,
			name: 'FedEX',
			shippingRate: 2.5,
			shippingDate: shippingDate,
			Eta: new Date(new Date(shippingDate).getTime() + (4 * 24 * 60 * 60 * 1000)).toDateString(),
		})
	},

	idConverter: (prefix, num) => {
		let str = num.toString();
		let leadingZeros = "00000".substring(0, 5 - str.length);
		return prefix + leadingZeros + str;
	},

	resetFilters: async () => {
		resetWidget('sel_status');
		resetWidget('dat_from');
		resetWidget('dat_to');

		await this.getOrders();
	},

	getOrders: async () => {
		const orders = await getOrders.run();
		const fromDate = dat_from.formattedDate || null;
		const toDate = dat_to.formattedDate || null;

		let filteredOrders = orders;

		// Filter based on date range if fromDate and toDate are provided
		if (fromDate && toDate) {
			filteredOrders = filteredOrders.filter(k => new Date(k.created) >= new Date(fromDate) && new Date(k.created) <= new Date(toDate));
		}

		// Filter based on status if sel_status is provided
		if (sel_status.selectedOptionValue) {
			filteredOrders = filteredOrders.filter(k => k.status === sel_status.selectedOptionValue);
		}

		return filteredOrders.map(o => {
			return {
				ID: this.idConverter('OR', o.id),
				Order_id: o.id,
				Order_date: o.created,
				Customer: o.first_name + ' ' + o.last_name,
				Total: o.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				DeliveryFee: o.shipping.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				ShippingAddress: o.address1,
				Status: o.status,
				Phone: o.phone,
				Email: o.email,
				Carrier: o.carrier,
				ShippingDate: o.shipping_date,
				Eta: o.eta,
				WeightKg: o.weight_kg ? o.weight_kg.toString() : '',
				WeightLbs: o.weight_lbs ? o.weight_lbs.toString() : '',
				Width: o.width ? o.width.toString() : '',
				Length: o.length ? o.length.toString() : '',
				height: o.height ? o.length.toString() : '',
				Tracking: o.tracking_no
			}
		}).sort((a, b) => a.id - b.id)
	},

	getOrderProducts: async () => {
		const orderProducts = await getOrderProducts.run();

		return orderProducts.map(p => {
			return {
				Id: p.id,
				Name: p.name,
				SKU: p.sku,
				Price: p.price,
				Quantity: p.quantity,
				Tax: p.taxes,
				Subtotal: parseInt(p.price) * parseInt(p.quantity),
				Image: p.image,
			}
		})
	},

	handleBarCode: async () => {
		const code = scn_productScanner.value;

		const orderProducts = await this.getOrderProducts();

		const foundProduct = orderProducts.filter(p => p.SKU === code);

		await this.selectOrderProduct(foundProduct[0]);
	},

	handleCheckProduct: async (currentItem) => {
		const orderProducts = appsmith.store.orderProducts || [];
		const itemExistsInOrderProduct = orderProducts.filter(p => p.product.Id === currentItem.Id);

		if (itemExistsInOrderProduct && itemExistsInOrderProduct.length > 0) {
			// remove item
			const removeOldProduct = orderProducts.filter(p => p.product.Id !== currentItem.Id);
			storeValue('orderProducts', [...removeOldProduct])
			return;
		} else {
			// Add all items
			storeValue('orderProducts', [...orderProducts, {
				product: currentItem,
				count: parseInt(currentItem.Quantity),
			}]);
			return;
		}
	},

	isChecked: (currentItem) => {
		const orderProducts = appsmith.store.orderProducts || [];
		const itemExistsInOrderProduct = orderProducts.filter(p => p.product.Id === currentItem.Id);

		if (itemExistsInOrderProduct && itemExistsInOrderProduct.length > 0) {
			// check that all items are in orderProducts
			if (itemExistsInOrderProduct[0].count === parseInt(currentItem.Quantity)) {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	},

	selectOrderProduct: async (product) => {
		if (product) {
			const orderProducts = appsmith.store.orderProducts || [];

			if (orderProducts.length === 0) {
				storeValue('orderProducts', [{
					product,
					count: 1,
				}])
				return
			}

			const productInOrderProduct = orderProducts.filter(p => p.product.Id === product.Id);
			if (productInOrderProduct && productInOrderProduct.length > 0) {

				if (productInOrderProduct[0].count < product.Quantity) {
					const removeOldProduct = orderProducts.filter(p => p.product.Id !== product.Id);
					storeValue('orderProducts', [...removeOldProduct, {
						product,
						count: productInOrderProduct[0].count + 1,
					}])
					return
				} else {
					return showAlert('All products added!', 'info');
				}
			} else {
				storeValue('orderProducts', [...orderProducts, {
					product,
					count: 1,
				}]);
				return
			}
		}
	},

	orderProductCount: () => {
		const storeProducts = appsmith.store.orderProducts ? appsmith.store.orderProducts.reduce((a, b) => a + b.count, 0) : 0;
		const allItems = lst_orderProducts.listData.reduce((a, b) => a + b.Quantity, 0);

		return `${storeProducts}/${allItems} items picked`;
	},

	singleOrderProductCount: (currentItem) => {
		let storedCount = 0;
		if (appsmith.store.orderProducts) {
			const product = appsmith.store.orderProducts.filter(p => p.product.Id === currentItem.Id);
			if (product.length > 0) {
				storedCount = product[0].count;
			}
		}

		return `${storedCount}/${currentItem.Quantity} Items`;
	},

	removeSingleOrderProduct: (currentItem) => {
		const orderProducts = appsmith.store.orderProducts || [];

		const orderProduct = orderProducts.filter(p => p.product.Id === currentItem.Id);

		if (orderProduct && orderProduct.length > 0) {
			if (orderProduct[0].count === 1) {
				const removeSingleProduct = orderProducts.filter(p => p.product.Id !== currentItem.Id);

				return storeValue('orderProducts', removeSingleProduct)
			} else {
				const removeSingleProduct = orderProducts.filter(p => p.product.Id !== currentItem.Id);

				return storeValue('orderProducts', [...removeSingleProduct, {
					product: currentItem,
					count: orderProduct[0].count - 1
				}])
			}
		}
	},

	updateStatus: async (statusId) => {

		if (!appsmith.store.orderProducts || appsmith.store.orderProducts.length < 1) {
			return showAlert('Pick products to continue', 'warning');
		}

		await updateOrderStatus.run({
			statusId,
		});

		await recordOrderTrack.run({
			orderStatusId: statusId
		});


		const orders = await this.getOrders();

		const order = orders.filter(o => o.Order_id === appsmith.store.order.Order_id);

		storeValue('order', order[0]);

		showAlert('Order Updated!', 'success');
	},

	updateOrderShipping: async () => {

		if (!sel_carrier.selectedOptionValue) {
			return showAlert('Add carrier to continue!', 'warning')
		}

		await updateOrderShipping.run();

		await recordOrderTrack.run({
			orderStatusId: 3
		})
		await this.getOrders();

		const orders = await this.getOrders();

		const order = orders.filter(o => o.Order_id === appsmith.store.order.Order_id);

		storeValue('order', order[0]);

		resetWidget('tbl_orders');

		showAlert('Order Updated!', 'success');
	},

	onOrderSelected: async () => {
		storeValue('order', tbl_orders.selectedRow);
		showModal('mdl_orderDetails')
		await this.getOrderProducts();
		await this.getOrderTrack()
		storeValue('orderProducts', null);
		resetWidget('lst_orderProducts');
	},

	getCarrierData: async () => {

		const shippingDate = dat_shippingDate.formattedDate || new Date().toISOString();

		const carriers = [
			{
				id: 1,
				name: 'FedEX',
				shippingRate: 2.5,
				shippingDate: shippingDate,
				Eta: new Date(new Date(shippingDate).getTime() + (4 * 24 * 60 * 60 * 1000)).toDateString(),
			},
			{
				id: 2,
				name: 'DHL',
				shippingRate: 3,
				shippingDate: dat_shippingDate.formattedDate,
				Eta: new Date(new Date(shippingDate).getTime() + (5* 24 * 60 * 60 * 1000)).toDateString(),
			},
			{
				id: 3,
				name: 'USPS',
				shippingRate: 2,
				shippingDate: dat_shippingDate.formattedDate,
				Eta: new Date(new Date(shippingDate).getTime() + (6 * 24 * 60 * 60 * 1000)).toDateString(),
			},
			{
				id: 4,
				name: 'Blue Dart',
				shippingRate: 3,
				shippingDate: dat_shippingDate.formattedDate,
				Eta: new Date(new Date(shippingDate).getTime() + (2 * 24 * 60 * 60 * 1000)).toDateString(),
			}
		]

		const carrierName = sel_carrier.selectedOptionValue;

		const carrier = carriers.filter(c => c.name === carrierName)[0];

		storeValue('carrier', carrier);

		return carrier;

	},

	getOrderTrack: async () => {
		const orderTrack = await getOrderTrack.run();

		return orderTrack.map((o, index) => {
			return {
				id: index,
				Status: o.label,
				Date: new Date(o.created).toDateString(),
				Time: new Date(o.created).toLocaleTimeString().slice(0, 5),
			}
		})
	},

	statusColor: (status) => {
		if (status === 'CANCELLED') {
			return 'RGB(255, 0, 0)'
		};
		if (status === 'UNFULFILLED' || status === 'PACKED') {
			return 'RGB(255, 165, 0)';
		};
		if (status === 'SHIPPED' || status === 'DELIVERED') {
			return 'RGB(0, 128, 0)'
		}
		return 'RGB(255, 165, 0)'
	},

	generateRandomLabelCode: () => {
		let code = '';
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

		for (let i = 0; i < 3; i++) {
			code += characters.charAt(Math.floor(Math.random() * characters.length));
		}

		code += ' ';

		for (let i = 0; i < 3; i++) {
			code += characters.charAt(Math.floor(Math.random() * characters.length));
		}

		return code;
	},

	generateLabel: async () => {
		const imgUrl = 'https://s3.us-east-2.amazonaws.com/template.appsmith.com/order-fulfillment-tracker-demo-label.jpg';
		let doc = new jspdf.jsPDF();

		let pdfData = await getPdfImage.run({url: imgUrl});

		//add image, scaled to fit 100% of doc width
		const docSize = _.pick(doc.internal.pageSize, ['width','height']);
		const imageSize = _.pick(doc.getImageProperties(pdfData), ['width','height'])
		const wRatio = docSize.width/imageSize.width;
		const newImgSize = {w:parseInt(imageSize.width*wRatio),h:parseInt(imageSize.height*wRatio)};
		await doc.addImage(pdfData, 'JPEG', 0, 0, newImgSize.w, newImgSize.h);

		//Set fonts and style
		const font = 'helvetica';
		const fontStyle = 'bold';
		const fontSize = 20;
		const textColor ='black';
		doc.setFont(font, fontStyle);
		doc.setFontSize(fontSize);
		doc.setTextColor(textColor);

		const inputLength = inp_length.text || '';
		const inputWidth = inp_width.text || '';
		const inputHeight = inp_height.text || '';
		const code = this.generateRandomLabelCode();

		const labelData = [
			{
				data: 'Order ID #' + appsmith.store.order.ID,
				x: 130,
				y: 10,
				fontSize: 20,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: inp_shipFrom.text,
				x: 5,
				y: 90,
				fontSize: 20,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: code,
				x: 5,
				y: 140,
				fontSize: 24,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: appsmith.store.order.ShippingAddress,
				x: 5,
				y: 260,
				fontSize: 20,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: 'CARRIER: ' + 'UPS',
				x: 5,
				y: 45,
				fontSize: 22,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: dat_shippingDate.formattedDate,
				x: 5,
				y: 10,
				fontSize: 20,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: inp_kg.text.length > 0 ? `Weight: ${inp_kg.text}kg` : '',
				x: 80,
				y: 140,
				fontSize: 14,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: inp_lbs.text.length > 0 ? `${inp_lbs.text}lbs` : '',
				x: 120,
				y: 140,
				fontSize: 14,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: `DIMENSIONS: ${inputLength} x ${inputWidth} x ${inputHeight}`,
				x: 80,
				y: 125,
				fontSize: 14,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: inp_trackingId.text.length > 0 ? inp_trackingId.text : '',
				x: 70,
				y: 212,
				fontSize: 16,
				fontStyle: 'bold',
				font: 'helvetica',
			},

		];


		// Loop through the template data and add the text to the PDF
		labelData.forEach((field) => {
			let fieldValue = field.data;
			fieldValue = typeof fieldValue == 'number' ? JSON.stringify(fieldValue) : fieldValue;
			doc.setFont(field.font, field.fontStyle);
			doc.setFontSize(field.fontSize);
			doc.text(fieldValue, field.x, field.y);
		});

		doc.save('mydocument.pdf');

		// Output to the browser
		const outputPDF = doc.output('dataurlstring');
		storeValue('labelPDF', outputPDF);
		return outputPDF;
	},

	generateInvoice: async () => {
		const imgUrl = 'https://s3.us-east-2.amazonaws.com/template.appsmith.com/order-fulfillment-tracker-demo-invoice.jpg';
		let doc = new jspdf.jsPDF();

		let pdfData = await getPdfImage.run({url: imgUrl});

		//add image, scaled to fit 100% of doc width
		const docSize = _.pick(doc.internal.pageSize, ['width','height']);
		const imageSize = _.pick(doc.getImageProperties(pdfData), ['width','height'])
		const wRatio = docSize.width/imageSize.width;
		const newImgSize = {w:parseInt(imageSize.width*wRatio),h:parseInt(imageSize.height*wRatio)};
		await doc.addImage(pdfData, 'JPEG', 0, 0, newImgSize.w, newImgSize.h);

		//Set fonts and style
		const font = 'helvetica';
		const fontStyle = 'bold';
		const fontSize = 20;
		const textColor ='black';
		doc.setFont(font, fontStyle);
		doc.setFontSize(fontSize);
		doc.setTextColor(textColor);

		const orderProductsName = tbl_orderProducts.tableData.map((p, index) => {
			return {
				data: p.Name,
				x: 20,
				y: 130 + index * 10,
				fontSize: 14,
				fontStyle: 'normal',
				font: 'helvetica',
			}
		});

		const orderProductsQty = tbl_orderProducts.tableData.map((p, index) => {
			return {
				data: p.Quantity,
				x: 110,
				y: 130 + index * 10,
				fontSize: 14,
				fontStyle: 'normal',
				font: 'helvetica',
			}
		});

		const orderProductsCost = tbl_orderProducts.tableData.map((p, index) => {
			return {
				data: p.Subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				x: 175,
				y: 130 + index * 10,
				fontSize: 14,
				fontStyle: 'normal',
				font: 'helvetica',
			}
		})

		const labelData = [
			...orderProductsName,
			...orderProductsQty,
			...orderProductsCost,
			{
				data: tbl_orderProducts.tableData.reduce((a, b) => a + b.Subtotal, 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				x: 170,
				y: 205,
				fontSize: 18,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: 'Order ID #' + appsmith.store.order.ID,
				x: 130,
				y: 25,
				fontSize: 18,
				fontStyle: 'bold',
				font: 'helvetica',
			},
			{
				data: inp_shipFrom.text || `1234 Industrial Blvd
Unit 5678
Cityville, State 98765



Phone: 988-989-9877`,
				x: 150,
				y: 60,
				fontSize: 14,
				fontStyle: 'normal',
				font: 'helvetica',
			},
			{
				data: appsmith.store.order.ShippingAddress,
				x: 10,
				y: 60,
				fontSize: 14,
				fontStyle: 'normal',
				font: 'helvetica',
			},
			{
				data: new Date(appsmith.store.order.Order_date).toDateString(),
				x: 10,
				y: 80,
				fontSize: 14,
				fontStyle: 'normal',
				font: 'helvetica',
			},
		];


		// Loop through the template data and add the text to the PDF
		labelData.forEach((field) => {
			let fieldValue = field.data;
			fieldValue = typeof fieldValue == 'number' ? JSON.stringify(fieldValue) : fieldValue;
			doc.setFont(field.font, field.fontStyle);
			doc.setFontSize(field.fontSize);
			doc.text(fieldValue, field.x, field.y);
		});

		doc.save('mydocument.pdf');

		// Output to the browser
		const outputPDF = doc.output('dataurlstring');
		storeValue('labelPDF', outputPDF);
		return outputPDF;
	},
}