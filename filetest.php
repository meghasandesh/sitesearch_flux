<?php
	$filepath = "testfiles/"."site1.dat";
	echo $filepath;

	if(file_exists($filepath)) {
		echo $filepath;
	}
	else echo 'not here';
?>