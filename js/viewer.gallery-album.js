$(function(){
	(function() {
		/* data models */
		var galleryModel = this.galleryModel = new cGalleryModel({
			$dataProvider: $('#album-view')
		});
		var gallery = new cGallery({
			model: galleryModel
		});
	}).call(window);
});